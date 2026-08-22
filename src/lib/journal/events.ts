import { createHash } from "node:crypto";

/**
 * The journal is an append-only log of events, hash-chained so that any edit to
 * the past is detectable.
 *
 * This is not architecture for its own sake. Doxa's entire claim is that you
 * wrote your reasoning down *before* you knew how it turned out — and a mutable
 * row cannot support that claim, because nothing distinguishes "I predicted
 * this" from "I said I predicted this". Every event's hash covers the previous
 * event's hash, so silently rewriting an entry breaks the chain from that point
 * to the head, and `verifyChain` reports exactly where.
 */

/** The `prevHash` of the first event. 64 zeroes, i.e. a hash of nothing. */
export const GENESIS_HASH = "0".repeat(64);

export type EventPayloads = {
  /**
   * A decision, frozen at the moment it was made. `falsifier` is the
   * preregistered criterion — what the person said, in advance, would count as
   * being wrong. It is captured here rather than at resolution precisely
   * because by resolution time it is no longer trustworthy.
   */
  DecisionMade: {
    decision: string;
    reasoning: string;
    confidence: number;
    category: string | null;
    consultedOthers: boolean;
    /** ISO 8601. Dates never cross this boundary as `Date`s — see `canonicalize`. */
    resolutionDate: string;
    falsifier: string | null;
    /** The disconfirming case, when the gate asked for one. */
    premortem: string | null;
    /**
     * Whether the premortem gate fired. Recorded even when it didn't, because
     * the decisions it skipped are the control group.
     *
     * Null for decisions made before the experiment existed. They are not
     * controls — nothing was withheld from them — and counting them as such
     * would load the arm they landed in with a year of un-intervened decisions.
     */
    premortemAssigned: boolean | null;
  };
  /**
   * What the person believed they had said, committed to the log *before* the
   * stored figure is disclosed to them. Making this its own event rather than a
   * field on the outcome is the whole point: the log then carries proof that the
   * recall was given first, rather than the interface merely having asked in
   * that order.
   */
  ConfidenceRecalled: {
    recalledConfidence: number;
    /**
     * False when the figure had already been unsealed. A recall taken after
     * peeking measures reading comprehension, not memory.
     */
    blind: boolean;
  };
  /** The outcome. */
  OutcomeRecorded: {
    outcome: "correct" | "incorrect";
    resolutionNote: string | null;
    adjudication: "self" | "external";
  };
  /**
   * The stated confidence is sealed while a decision is open — seeing it invites
   * you to re-anchor on it, and it would make the recall question at resolution
   * meaningless. Unsealing is allowed, but it is recorded, and it disqualifies
   * that entry from the hindsight statistics.
   */
  ConfidenceRevealed: Record<string, never>;
};

export type EventType = keyof EventPayloads;

export type JournalEvent<T extends EventType = EventType> = {
  [K in EventType]: {
    type: K;
    entryId: string;
    recordedAt: Date;
    payload: EventPayloads[K];
  };
}[T];

export const EVENT_TYPES = [
  "DecisionMade",
  "ConfidenceRecalled",
  "OutcomeRecorded",
  "ConfidenceRevealed",
] as const;

export function isEventType(value: string): value is EventType {
  return (EVENT_TYPES as readonly string[]).includes(value);
}

/**
 * Deterministic JSON: object keys sorted, no insignificant whitespace.
 *
 * `JSON.stringify` preserves insertion order, so two payloads that are equal as
 * values can serialise differently and hash differently — which would make the
 * chain break for reasons that have nothing to do with tampering. Sorting keys
 * removes that whole class of false positive.
 *
 * `Date` is rejected rather than serialised: a payload must carry ISO strings,
 * so that the digest can never depend on the writer's timezone.
 */
export function canonicalize(value: unknown): string {
  if (value === null) return "null";

  if (value instanceof Date) {
    throw new TypeError(
      "Refusing to hash a Date — put an ISO string in the payload so the digest doesn't depend on the writer's timezone."
    );
  }

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) {
        throw new TypeError(`Cannot hash a non-finite number (${value}).`);
      }
      // -0 and 0 are the same value but stringify differently.
      return JSON.stringify(value === 0 ? 0 : value);
    case "string":
      return JSON.stringify(value);
    case "undefined":
      throw new TypeError("Cannot hash `undefined` at the top level.");
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      // Omitted keys and explicitly-undefined keys must hash identically,
      // matching how JSON.stringify treats them.
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`);
    return `{${entries.join(",")}}`;
  }

  throw new TypeError(`Cannot hash a value of type ${typeof value}.`);
}

/**
 * The exact bytes a hash is taken over.
 *
 * Every variable-length field is JSON-encoded before being joined, so a newline
 * inside a value cannot forge a field boundary. Without that, a type of `"A"`
 * with an entryId of `"B\nC"` and a type of `"A\nB"` with an entryId of `"C"`
 * would produce identical preimages. Nothing in the current schema can reach
 * that state — `type` comes from a fixed set — but relying on a downstream
 * constraint to keep a hash unambiguous is how encodings get broken later.
 */
export function preimage(prevHash: string, event: JournalEvent): string {
  return [
    prevHash,
    JSON.stringify(event.type),
    JSON.stringify(event.entryId),
    JSON.stringify(event.recordedAt.toISOString()),
    canonicalize(event.payload),
  ].join("\n");
}

export function eventHash(prevHash: string, event: JournalEvent): string {
  return createHash("sha256").update(preimage(prevHash, event), "utf8").digest("hex");
}

/** Hashes a run of events starting from `from`, returning each link in order. */
export function chain(
  events: JournalEvent[],
  from: string = GENESIS_HASH
): { event: JournalEvent; prevHash: string; hash: string }[] {
  const links: { event: JournalEvent; prevHash: string; hash: string }[] = [];
  let prevHash = from;
  for (const event of events) {
    const hash = eventHash(prevHash, event);
    links.push({ event, prevHash, hash });
    prevHash = hash;
  }
  return links;
}
