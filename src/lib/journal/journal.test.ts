import { describe, expect, it } from "vitest";
import {
  GENESIS_HASH,
  canonicalize,
  chain,
  eventHash,
  preimage,
  type JournalEvent,
} from "./events";
import { ProjectionError, applyEvent, projectAll, projectEntry } from "./project";
import { checkChain, checkProjection } from "./verify";
import type { StoredEvent } from "./log";

const at = (iso: string) => new Date(iso);

function made(entryId: string, overrides: Partial<JournalEvent<"DecisionMade">["payload"]> = {}) {
  return {
    type: "DecisionMade",
    entryId,
    recordedAt: at("2026-01-01T00:00:00.000Z"),
    payload: {
      decision: "Take the offer.",
      reasoning: "Wider scope.",
      confidence: 80,
      category: "career",
      consultedOthers: false,
      resolutionDate: "2026-06-01T00:00:00.000Z",
      falsifier: "I'm still there in a year and wish I'd left.",
      ...overrides,
    },
  } satisfies JournalEvent<"DecisionMade">;
}

function resolved(
  entryId: string,
  overrides: Partial<JournalEvent<"OutcomeRecorded">["payload"]> = {}
) {
  return {
    type: "OutcomeRecorded",
    entryId,
    recordedAt: at("2026-06-01T00:00:00.000Z"),
    payload: {
      outcome: "correct",
      resolutionNote: "Went fine.",
      adjudication: "self",
      ...overrides,
    },
  } satisfies JournalEvent<"OutcomeRecorded">;
}

function recalled(entryId: string, value = 72, blind = true) {
  return {
    type: "ConfidenceRecalled",
    entryId,
    recordedAt: at("2026-05-31T00:00:00.000Z"),
    payload: { recalledConfidence: value, blind },
  } satisfies JournalEvent<"ConfidenceRecalled">;
}

describe("canonicalize", () => {
  it("is insensitive to key order", () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe(canonicalize({ a: 2, b: 1 }));
  });

  it("distinguishes values that differ", () => {
    expect(canonicalize({ a: 1 })).not.toBe(canonicalize({ a: 2 }));
    expect(canonicalize({ a: "1" })).not.toBe(canonicalize({ a: 1 }));
    expect(canonicalize([1, 2])).not.toBe(canonicalize([2, 1]));
  });

  it("treats an omitted key and an undefined one identically", () => {
    expect(canonicalize({ a: 1, b: undefined })).toBe(canonicalize({ a: 1 }));
  });

  it("collapses negative zero, which would otherwise hash differently", () => {
    expect(canonicalize(-0)).toBe(canonicalize(0));
  });

  it("refuses a Date, so a digest can't depend on the writer's timezone", () => {
    expect(() => canonicalize({ when: new Date() })).toThrow(TypeError);
  });

  it("refuses non-finite numbers rather than emitting null", () => {
    expect(() => canonicalize({ n: NaN })).toThrow(TypeError);
    expect(() => canonicalize({ n: Infinity })).toThrow(TypeError);
  });

  it("sorts nested keys too", () => {
    expect(canonicalize({ o: { z: 1, a: 2 } })).toBe(canonicalize({ o: { a: 2, z: 1 } }));
  });
});

describe("eventHash", () => {
  it("is stable across runs", () => {
    expect(eventHash(GENESIS_HASH, made("e1"))).toBe(eventHash(GENESIS_HASH, made("e1")));
  });

  it("changes when any part of the event changes", () => {
    const base = eventHash(GENESIS_HASH, made("e1"));
    expect(eventHash(GENESIS_HASH, made("e1", { confidence: 81 }))).not.toBe(base);
    expect(eventHash(GENESIS_HASH, made("e2"))).not.toBe(base);
    expect(
      eventHash(GENESIS_HASH, { ...made("e1"), recordedAt: at("2026-01-02T00:00:00.000Z") })
    ).not.toBe(base);
  });

  it("changes when the predecessor changes, which is what chains it", () => {
    expect(eventHash("a".repeat(64), made("e1"))).not.toBe(eventHash(GENESIS_HASH, made("e1")));
  });

  it("cannot have a field boundary forged by a newline inside a value", () => {
    // "x" + "\ny" and "x\n" + "y" must not produce the same preimage.
    const a = preimage(GENESIS_HASH, { ...made("x"), entryId: "x\ny" } as JournalEvent);
    const b = preimage(GENESIS_HASH, { ...made("x"), entryId: "x" } as JournalEvent);
    expect(a).not.toBe(b);
    expect(a.split("\n").length).toBe(b.split("\n").length);
  });
});

describe("checkChain", () => {
  const stored = (events: JournalEvent[]): StoredEvent[] =>
    chain(events).map((link, i) => ({
      seq: i + 1,
      prevHash: link.prevHash,
      hash: link.hash,
      event: link.event,
    }));

  it("passes on an untouched chain", () => {
    const report = checkChain(stored([made("e1"), resolved("e1"), made("e2")]));
    expect(report.ok).toBe(true);
    expect(report.events).toBe(3);
    expect(report.breaks).toEqual([]);
  });

  it("passes on an empty log", () => {
    const report = checkChain([]);
    expect(report.ok).toBe(true);
    expect(report.head).toBe(GENESIS_HASH);
  });

  it("catches an edited payload", () => {
    const log = stored([made("e1"), resolved("e1")]);
    log[0].event = made("e1", { confidence: 99 });
    const report = checkChain(log);
    expect(report.ok).toBe(false);
    expect(report.breaks[0]).toMatchObject({ seq: 1, reason: "hash-mismatch" });
  });

  it("catches a deleted event by the hole it leaves in the links", () => {
    const log = stored([made("e1"), resolved("e1"), made("e2")]);
    const withHole = [log[0], log[2]];
    const report = checkChain(withHole);
    expect(report.ok).toBe(false);
    expect(report.breaks[0]).toMatchObject({ reason: "link-mismatch" });
  });

  it("reports one break per edit rather than cascading to the head", () => {
    const log = stored([made("e1"), resolved("e1"), made("e2"), made("e3")]);
    log[1].event = resolved("e1", { outcome: "incorrect" });
    const report = checkChain(log);
    expect(report.breaks).toHaveLength(1);
    expect(report.breaks[0].seq).toBe(2);
  });
});

describe("projection", () => {
  it("opens an entry from a decision", () => {
    const state = projectEntry([made("e1")])!;
    expect(state.status).toBe("open");
    expect(state.confidence).toBe(80);
    expect(state.createdAt).toEqual(at("2026-01-01T00:00:00.000Z"));
    expect(state.resolvedAt).toBeNull();
  });

  it("closes it on an outcome, dating it from when the outcome was recorded", () => {
    const state = projectEntry([made("e1"), recalled("e1"), resolved("e1")])!;
    expect(state.status).toBe("resolved");
    expect(state.outcome).toBe("correct");
    expect(state.resolvedAt).toEqual(at("2026-06-01T00:00:00.000Z"));
    expect(state.recalledConfidence).toBe(72);
    expect(state.recallBlind).toBe(true);
  });

  it("keeps only the first recall, since a second is given knowing the first missed", () => {
    const state = projectEntry([made("e1"), recalled("e1", 72), recalled("e1", 80)])!;
    expect(state.recalledConfidence).toBe(72);
  });

  it("refuses a recall after the outcome is already in", () => {
    expect(() => projectEntry([made("e1"), resolved("e1"), recalled("e1")])).toThrow(
      ProjectionError
    );
  });

  it("refuses to create the same entry twice", () => {
    expect(() => projectEntry([made("e1"), made("e1")])).toThrow(ProjectionError);
  });

  it("refuses an outcome for an entry that was never made", () => {
    expect(() => projectEntry([resolved("e1")])).toThrow(ProjectionError);
  });

  it("refuses to resolve the same entry twice", () => {
    expect(() => projectEntry([made("e1"), resolved("e1"), resolved("e1")])).toThrow(
      ProjectionError
    );
  });

  it("records the first reveal and ignores later ones", () => {
    const reveal = (iso: string) =>
      ({
        type: "ConfidenceRevealed",
        entryId: "e1",
        recordedAt: at(iso),
        payload: {},
      }) as JournalEvent;

    const state = projectEntry([
      made("e1"),
      reveal("2026-02-01T00:00:00.000Z"),
      reveal("2026-03-01T00:00:00.000Z"),
    ])!;
    expect(state.confidenceRevealedAt).toEqual(at("2026-02-01T00:00:00.000Z"));
  });

  it("keeps entries independent when the log interleaves them", () => {
    const all = projectAll([made("e1"), made("e2"), resolved("e1")]);
    expect(all.get("e1")!.status).toBe("resolved");
    expect(all.get("e2")!.status).toBe("open");
  });

  it("folds an empty log to nothing", () => {
    expect(projectEntry([])).toBeNull();
  });

  it("rejects an unknown transition rather than silently ignoring it", () => {
    expect(() => applyEvent(null, resolved("e1"))).toThrow(ProjectionError);
  });
});

describe("checkProjection", () => {
  const log: StoredEvent[] = chain([made("e1"), recalled("e1"), resolved("e1")]).map((l, i) => ({
    seq: i + 1,
    prevHash: l.prevHash,
    hash: l.hash,
    event: l.event,
  }));
  const row = () => ({
    id: "e1",
    decision: "Take the offer.",
    reasoning: "Wider scope.",
    confidence: 80,
    category: "career",
    consultedOthers: false,
    createdAt: at("2026-01-01T00:00:00.000Z"),
    resolutionDate: at("2026-06-01T00:00:00.000Z"),
    falsifier: "I'm still there in a year and wish I'd left.",
    status: "resolved",
    outcome: "correct",
    resolutionNote: "Went fine.",
    resolvedAt: at("2026-06-01T00:00:00.000Z"),
    recalledConfidence: 72,
    recallBlind: true,
    confidenceRevealedAt: null,
    adjudication: "self",
  });

  it("passes when the table matches the replay", () => {
    expect(checkProjection(log, [row()]).ok).toBe(true);
  });

  it("catches a row edited behind the log's back", () => {
    const report = checkProjection(log, [{ ...row(), confidence: 99 }]);
    expect(report.ok).toBe(false);
    expect(report.drift[0]).toMatchObject({ field: "confidence", inLog: 80, inTable: 99 });
  });

  it("catches a row that the log has no events for", () => {
    const report = checkProjection(log, [row(), { ...row(), id: "ghost" }]);
    expect(report.drift).toContainEqual({
      entryId: "ghost",
      field: "*",
      inLog: "missing",
      inTable: "present",
    });
  });

  it("catches an entry the log knows about but the table lost", () => {
    const report = checkProjection(log, []);
    expect(report.drift[0]).toMatchObject({ entryId: "e1", inTable: "missing" });
  });
});
