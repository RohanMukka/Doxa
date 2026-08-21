import { prisma } from "@/lib/prisma";
import { GENESIS_HASH, canonicalize, eventHash } from "@/lib/journal/events";
import { projectAll, type EntryState } from "@/lib/journal/project";
import { readLog, type StoredEvent } from "@/lib/journal/log";

/**
 * A hash chain nobody checks is decoration. This is the check.
 *
 * Two independent questions get asked:
 *
 *   1. Is the log internally consistent? Every event's stored hash must be the
 *      hash of its contents and its predecessor, and the links must form one
 *      unbroken run from genesis. An edited entry, a deleted event, or a
 *      reordered one all fail here, and the report names the first `seq` where
 *      it went wrong.
 *   2. Does the projection match the log? Replaying every event must reproduce
 *      the `Entry` table exactly. A mismatch means something wrote to `Entry`
 *      without going through `append` — the log says one thing, the app shows
 *      another, and the log is the one to believe.
 */

export type ChainBreak = {
  seq: number;
  reason: "hash-mismatch" | "link-mismatch";
  expected: string;
  found: string;
};

export type ChainReport = {
  ok: boolean;
  events: number;
  head: string;
  breaks: ChainBreak[];
};

export function checkChain(log: StoredEvent[]): ChainReport {
  const breaks: ChainBreak[] = [];
  let prevHash = GENESIS_HASH;

  for (const stored of log) {
    if (stored.prevHash !== prevHash) {
      breaks.push({
        seq: stored.seq,
        reason: "link-mismatch",
        expected: prevHash,
        found: stored.prevHash,
      });
    }

    // Recompute from the event's own recorded prevHash, so one break is
    // reported once rather than cascading through every later event.
    const expected = eventHash(stored.prevHash, stored.event);
    if (expected !== stored.hash) {
      breaks.push({
        seq: stored.seq,
        reason: "hash-mismatch",
        expected,
        found: stored.hash,
      });
    }

    prevHash = stored.hash;
  }

  return { ok: breaks.length === 0, events: log.length, head: prevHash, breaks };
}

export type ProjectionDrift = {
  entryId: string;
  field: string;
  inLog: unknown;
  inTable: unknown;
};

export type ProjectionReport = {
  ok: boolean;
  entries: number;
  drift: ProjectionDrift[];
};

const PROJECTED_FIELDS = [
  "decision",
  "reasoning",
  "confidence",
  "category",
  "consultedOthers",
  "createdAt",
  "resolutionDate",
  "falsifier",
  "status",
  "outcome",
  "resolutionNote",
  "resolvedAt",
  "recalledConfidence",
  "recallBlind",
  "confidenceRevealedAt",
  "adjudication",
] as const;

/** Dates compare by instant; everything else by canonical form. */
function differs(a: unknown, b: unknown): boolean {
  if (a instanceof Date || b instanceof Date) {
    const at = a instanceof Date ? a.getTime() : NaN;
    const bt = b instanceof Date ? b.getTime() : NaN;
    return !(Number.isFinite(at) && Number.isFinite(bt) && at === bt);
  }
  return canonicalize(a ?? null) !== canonicalize(b ?? null);
}

export function checkProjection(
  log: StoredEvent[],
  rows: Record<string, unknown>[]
): ProjectionReport {
  const replayed = projectAll(log.map((s) => s.event));
  const byId = new Map(rows.map((r) => [r.id as string, r]));
  const drift: ProjectionDrift[] = [];

  for (const [id, state] of replayed) {
    const row = byId.get(id);
    if (!row) {
      drift.push({ entryId: id, field: "*", inLog: "present", inTable: "missing" });
      continue;
    }
    for (const field of PROJECTED_FIELDS) {
      const inLog = state[field as keyof EntryState];
      const inTable = row[field];
      if (differs(inLog, inTable)) {
        drift.push({ entryId: id, field, inLog, inTable });
      }
    }
  }

  for (const id of byId.keys()) {
    if (!replayed.has(id)) {
      drift.push({ entryId: id, field: "*", inLog: "missing", inTable: "present" });
    }
  }

  return { ok: drift.length === 0, entries: replayed.size, drift };
}

export type VerifyReport = {
  ok: boolean;
  chain: ChainReport;
  projection: ProjectionReport;
};

export async function verifyJournal(db = prisma): Promise<VerifyReport> {
  const log = await readLog(db);
  const rows = await db.entry.findMany();
  const chain = checkChain(log);
  const projection = checkProjection(log, rows as unknown as Record<string, unknown>[]);
  return { ok: chain.ok && projection.ok, chain, projection };
}
