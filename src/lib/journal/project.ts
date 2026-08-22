import type { JournalEvent } from "@/lib/journal/events";

/**
 * The fold from events to the state the app reads.
 *
 * Kept pure and separate from storage so that the projection can be replayed
 * and compared against what's actually in the `Entry` table — see `verify.ts`.
 * If those two ever disagree, the table has been written to by something that
 * bypassed the log, which is exactly the failure this design exists to catch.
 */

export type EntryState = {
  id: string;
  decision: string;
  reasoning: string;
  confidence: number;
  category: string | null;
  consultedOthers: boolean;
  createdAt: Date;
  resolutionDate: Date;
  falsifier: string | null;
  premortem: string | null;
  premortemAssigned: boolean | null;
  resolver: string | null;
  status: "open" | "resolved";
  outcome: "correct" | "incorrect" | null;
  resolutionNote: string | null;
  resolvedAt: Date | null;
  recalledConfidence: number | null;
  recallBlind: boolean | null;
  confidenceRevealedAt: Date | null;
  adjudication: "self" | "external" | null;
  evidence: string | null;
  evidenceSource: string | null;
};

export class ProjectionError extends Error {}

export function applyEvent(state: EntryState | null, event: JournalEvent): EntryState {
  switch (event.type) {
    case "DecisionMade": {
      if (state) {
        throw new ProjectionError(
          `Entry ${event.entryId} was already created — a decision cannot be made twice.`
        );
      }
      const p = event.payload;
      return {
        id: event.entryId,
        decision: p.decision,
        reasoning: p.reasoning,
        confidence: p.confidence,
        category: p.category,
        consultedOthers: p.consultedOthers,
        createdAt: event.recordedAt,
        resolutionDate: new Date(p.resolutionDate),
        falsifier: p.falsifier,
        premortem: p.premortem,
        premortemAssigned: p.premortemAssigned,
        resolver: p.resolver,
        status: "open",
        outcome: null,
        resolutionNote: null,
        resolvedAt: null,
        recalledConfidence: null,
        recallBlind: null,
        evidence: null,
        evidenceSource: null,
        confidenceRevealedAt: null,
        adjudication: null,
      };
    }

    case "OutcomeRecorded": {
      if (!state) {
        throw new ProjectionError(
          `Entry ${event.entryId} was resolved before it was ever created.`
        );
      }
      if (state.status === "resolved") {
        throw new ProjectionError(
          `Entry ${event.entryId} is already resolved — an outcome is recorded once.`
        );
      }
      const p = event.payload;
      return {
        ...state,
        status: "resolved",
        outcome: p.outcome,
        resolutionNote: p.resolutionNote,
        resolvedAt: event.recordedAt,
        adjudication: p.adjudication,
        evidence: p.evidence,
        evidenceSource: p.evidenceSource,
      };
    }

    case "ConfidenceRecalled": {
      if (!state) {
        throw new ProjectionError(
          `Entry ${event.entryId} had a confidence recalled before it was ever created.`
        );
      }
      if (state.status === "resolved") {
        throw new ProjectionError(
          `Entry ${event.entryId} is already resolved — recalling afterwards is not the measurement.`
        );
      }
      // Only the first answer counts. A second attempt is made knowing the
      // first was wrong, which is a different question entirely.
      if (state.recalledConfidence !== null) return state;
      return {
        ...state,
        recalledConfidence: event.payload.recalledConfidence,
        recallBlind: event.payload.blind,
      };
    }

    case "ConfidenceRevealed": {
      if (!state) {
        throw new ProjectionError(
          `Entry ${event.entryId} was unsealed before it was ever created.`
        );
      }
      // Idempotent: only the first reveal matters, and re-recording it would
      // move the timestamp that decides whether a later recall was blind.
      if (state.confidenceRevealedAt) return state;
      return { ...state, confidenceRevealedAt: event.recordedAt };
    }
  }
}

/** Replays one entry's events. Null when the entry has no `DecisionMade`. */
export function projectEntry(events: JournalEvent[]): EntryState | null {
  return events.reduce<EntryState | null>(
    (state, event) => applyEvent(state, event),
    null
  );
}

/**
 * Replays the whole log. `events` must be in append order — the log's ordering
 * is what makes the fold meaningful, and re-sorting it here would hide exactly
 * the kind of corruption we want surfaced.
 */
export function projectAll(events: JournalEvent[]): Map<string, EntryState> {
  const states = new Map<string, EntryState>();
  for (const event of events) {
    states.set(event.entryId, applyEvent(states.get(event.entryId) ?? null, event));
  }
  return states;
}
