import { prisma } from "@/lib/prisma";
import {
  GENESIS_HASH,
  canonicalize,
  eventHash,
  isEventType,
  type EventPayloads,
  type EventType,
  type JournalEvent,
} from "@/lib/journal/events";
import { applyEvent, type EntryState } from "@/lib/journal/project";

/**
 * Storage for the event log, and the only sanctioned way to change the journal.
 *
 * Every write appends to the chain first and derives the `Entry` row from the
 * result, never the other way round. Anything that writes `Entry` directly is a
 * bug — `verifyProjection` exists to find it.
 */

type Db = typeof prisma;
/** The subset of the client an interactive transaction hands back. */
type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];

/**
 * Appends are serialised in-process, because computing the next hash requires
 * reading the current head and two concurrent writers would otherwise chain
 * from the same link. SQLite gives us one writer per database, so this closes
 * the gap for the single-process case the app actually runs in; a multi-process
 * deployment would need the tip read and the insert under one lock in the
 * database instead.
 */
let queue: Promise<unknown> = Promise.resolve();

function serialised<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.then(work, work);
  // Keep the chain alive after a rejection so one failed append doesn't wedge
  // every later one.
  queue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

export type NewEvent<T extends EventType = EventType> = {
  [K in EventType]: { type: K; entryId: string; recordedAt?: Date; payload: EventPayloads[K] };
}[T];

export type AppendResult = {
  head: string;
  entries: EntryState[];
};

/**
 * Appends events and updates the projection in one transaction. Passing several
 * events writes them as one atomic run — either the whole run lands or none of
 * it does, so the chain can never end mid-way through a logical change.
 */
export async function append(events: NewEvent[], db: Db = prisma): Promise<AppendResult> {
  if (events.length === 0) throw new Error("Nothing to append.");

  return serialised(() =>
    db.$transaction(async (tx) => {
      const tip = await tx.event.findFirst({ orderBy: { seq: "desc" } });
      let prevHash = tip?.hash ?? GENESIS_HASH;

      const touched = new Map<string, EntryState>();

      for (const incoming of events) {
        const event: JournalEvent = {
          type: incoming.type,
          entryId: incoming.entryId,
          recordedAt: incoming.recordedAt ?? new Date(),
          payload: incoming.payload,
        } as JournalEvent;

        const hash = eventHash(prevHash, event);

        await tx.event.create({
          data: {
            type: event.type,
            entryId: event.entryId,
            payload: canonicalize(event.payload),
            recordedAt: event.recordedAt,
            prevHash,
            hash,
          },
        });

        // Fold onto whatever the entry already is. Reading the projection back
        // (rather than trusting the caller) is what makes the invalid
        // transitions in `applyEvent` actually enforceable.
        const current =
          touched.get(event.entryId) ?? (await loadEntryState(event.entryId, tx));
        const next = applyEvent(current, event);
        touched.set(event.entryId, next);

        prevHash = hash;
      }

      for (const state of touched.values()) {
        await writeProjection(state, tx);
      }

      return { head: prevHash, entries: [...touched.values()] };
    })
  );
}

async function loadEntryState(entryId: string, tx: Tx): Promise<EntryState | null> {
  const row = await tx.entry.findUnique({ where: { id: entryId } });
  if (!row) return null;
  return {
    id: row.id,
    decision: row.decision,
    reasoning: row.reasoning,
    confidence: row.confidence,
    category: row.category,
    consultedOthers: row.consultedOthers,
    createdAt: row.createdAt,
    resolutionDate: row.resolutionDate,
    falsifier: row.falsifier,
    premortem: row.premortem,
    premortemAssigned: row.premortemAssigned,
    status: row.status === "resolved" ? "resolved" : "open",
    outcome: row.outcome as EntryState["outcome"],
    resolutionNote: row.resolutionNote,
    resolvedAt: row.resolvedAt,
    recalledConfidence: row.recalledConfidence,
    recallBlind: row.recallBlind,
    confidenceRevealedAt: row.confidenceRevealedAt,
    adjudication: row.adjudication as EntryState["adjudication"],
  };
}

async function writeProjection(state: EntryState, tx: Tx) {
  const data = {
    decision: state.decision,
    reasoning: state.reasoning,
    confidence: state.confidence,
    category: state.category,
    consultedOthers: state.consultedOthers,
    createdAt: state.createdAt,
    resolutionDate: state.resolutionDate,
    falsifier: state.falsifier,
    premortem: state.premortem,
    premortemAssigned: state.premortemAssigned,
    status: state.status,
    outcome: state.outcome,
    resolutionNote: state.resolutionNote,
    resolvedAt: state.resolvedAt,
    recalledConfidence: state.recalledConfidence,
    recallBlind: state.recallBlind,
    confidenceRevealedAt: state.confidenceRevealedAt,
    adjudication: state.adjudication,
  };
  await tx.entry.upsert({
    where: { id: state.id },
    create: { id: state.id, ...data },
    update: data,
  });
}

export function decodeEvent(row: {
  type: string;
  entryId: string;
  payload: string;
  recordedAt: Date;
}): JournalEvent {
  if (!isEventType(row.type)) {
    throw new Error(`Unknown event type in the log: ${row.type}`);
  }
  return {
    type: row.type,
    entryId: row.entryId,
    recordedAt: row.recordedAt,
    payload: JSON.parse(row.payload),
  } as JournalEvent;
}

export type StoredEvent = {
  seq: number;
  prevHash: string;
  hash: string;
  event: JournalEvent;
};

/** The whole log in append order. */
export async function readLog(db: Db = prisma): Promise<StoredEvent[]> {
  const rows = await db.event.findMany({ orderBy: { seq: "asc" } });
  return rows.map((row) => ({
    seq: row.seq,
    prevHash: row.prevHash,
    hash: row.hash,
    event: decodeEvent(row),
  }));
}

export async function head(db: Db = prisma): Promise<string> {
  const tip = await db.event.findFirst({ orderBy: { seq: "desc" } });
  return tip?.hash ?? GENESIS_HASH;
}
