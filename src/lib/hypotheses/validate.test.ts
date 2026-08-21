import { describe, expect, it } from "vitest";
import type { Subject } from "./predicate";
import {
  controlFalseDiscovery,
  testHypothesis,
  trainingSplit,
  type HypothesisResult,
} from "./validate";

const subject = (over: Partial<Subject> = {}): Subject => ({
  confidence: 80,
  outcome: "correct",
  consultedOthers: false,
  category: "career",
  reasoning: "The team is stronger and the scope is wider.",
  ...over,
});

describe("testHypothesis", () => {
  const group = (n: number, confidence: number, correctCount: number): Subject[] =>
    Array.from({ length: n }, (_, i) =>
      subject({
        confidence,
        outcome: i < correctCount ? "correct" : "incorrect",
        consultedOthers: confidence < 85,
      })
    );

  it("refuses to test a predicate that catches almost nothing", () => {
    const holdout = [...group(10, 60, 6), ...group(2, 90, 1)];
    const r = testHypothesis({ field: "confidence", op: "gte", value: 85 }, holdout);
    expect(r.outcome).toBe("untestable");
    expect(r.reason).toMatch(/too few/i);
  });

  it("refuses when every held-out decision falls on one side", () => {
    const r = testHypothesis({ field: "confidence", op: "gte", value: 85 }, group(10, 60, 6));
    expect(r.outcome).toBe("untestable");
  });

  it("holds a real subgroup effect", () => {
    // Inside: says 95, right 20% of the time. Outside: says 60, right 60%.
    const holdout = [...group(20, 95, 4), ...group(20, 60, 12)];
    const r = testHypothesis({ field: "confidence", op: "gte", value: 85 }, holdout);
    expect(r.lift).toBeGreaterThan(40);
    expect(r.p).toBeLessThan(0.05);
    expect(r.outcome).toBe("held");
  });

  it("fails a subgroup that is no different from the rest", () => {
    // Two groups genuinely split by the predicate, with identical calibration.
    const holdout = [
      ...Array.from({ length: 15 }, (_, i) =>
        subject({ confidence: 70, outcome: i < 10 ? "correct" : "incorrect", consultedOthers: false })
      ),
      ...Array.from({ length: 15 }, (_, i) =>
        subject({ confidence: 70, outcome: i < 10 ? "correct" : "incorrect", consultedOthers: true })
      ),
    ];
    const r = testHypothesis({ field: "consultedOthers", eq: false }, holdout);
    expect(r.nInside).toBe(15);
    expect(r.nOutside).toBe(15);
    expect(r.lift).toBe(0);
    expect(r.outcome).toBe("failed");
  });

  it("is deterministic", () => {
    const holdout = [...group(12, 90, 4), ...group(12, 60, 8)];
    const p = { field: "confidence", op: "gte", value: 85 } as const;
    expect(testHypothesis(p, holdout)).toEqual(testHypothesis(p, holdout));
  });

  it("never reports a p of zero", () => {
    const holdout = [...group(20, 99, 0), ...group(20, 40, 20)];
    const r = testHypothesis({ field: "confidence", op: "gte", value: 85 }, holdout, 200);
    expect(r.p).toBeGreaterThan(0);
  });
});

describe("controlFalseDiscovery", () => {
  const result = (p: number): HypothesisResult => ({
    lift: 20, nInside: 10, nOutside: 10, p, q: p, outcome: p < 0.05 ? "held" : "failed",
  });

  it("demotes a lucky-looking result out of a large batch", () => {
    // One at 0.04 among twenty is what chance produces; on its own it looked
    // like a finding.
    const batch = [result(0.04), ...Array.from({ length: 19 }, () => result(0.6))];
    const corrected = controlFalseDiscovery(batch);
    expect(batch[0].outcome).toBe("held");
    expect(corrected[0].outcome).toBe("failed");
    expect(corrected[0].q).toBeGreaterThan(0.1);
  });

  it("keeps a result that is strong enough to survive the correction", () => {
    const corrected = controlFalseDiscovery([result(0.0001), result(0.5), result(0.7)]);
    expect(corrected[0].outcome).toBe("held");
  });

  it("leaves untestable rows out of the correction entirely", () => {
    const batch: HypothesisResult[] = [
      result(0.01),
      { lift: 0, nInside: 1, nOutside: 30, p: 1, q: 1, outcome: "untestable" },
    ];
    const corrected = controlFalseDiscovery(batch);
    expect(corrected[1].outcome).toBe("untestable");
    // Only one hypothesis was actually tested, so it pays no multiplicity.
    expect(corrected[0].q).toBeCloseTo(0.01, 6);
  });

  it("keeps adjusted values monotonic in the raw ones", () => {
    const corrected = controlFalseDiscovery([result(0.01), result(0.02), result(0.03)]);
    expect(corrected[0].q).toBeLessThanOrEqual(corrected[1].q);
    expect(corrected[1].q).toBeLessThanOrEqual(corrected[2].q);
  });
});

describe("trainingSplit", () => {
  it("holds back the most recent decisions, not a random sample", () => {
    const entries = Array.from({ length: 40 }, (_, i) => i);
    const { training, holdout } = trainingSplit(entries);
    expect(training[training.length - 1]).toBeLessThan(holdout[0]);
    expect(training.length + holdout.length).toBe(40);
    expect(holdout).toHaveLength(12);
  });

  it("never leaves a holdout too small to test anything", () => {
    const { holdout } = trainingSplit(Array.from({ length: 10 }, (_, i) => i));
    expect(holdout.length).toBeGreaterThanOrEqual(8);
  });
});
