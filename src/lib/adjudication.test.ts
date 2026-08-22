import { describe, expect, it } from "vitest";
import { adjudicationSplit } from "./adjudication";

const rows = (n: number, confidence: number, correct: number, adjudication: string) =>
  Array.from({ length: n }, (_, i) => ({
    confidence,
    outcome: i < correct ? "correct" : "incorrect",
    adjudication,
  }));

describe("adjudicationSplit", () => {
  it("treats anything not marked external as self-graded", () => {
    // Entries written before adjudication was tracked carry null, and they are
    // self-graded — that is what they were.
    const r = adjudicationSplit(
      [...rows(4, 80, 3, "self"), ...rows(3, 80, 2, null as unknown as string)],
      0
    );
    expect(r.self.n).toBe(7);
    expect(r.external.n).toBe(0);
  });

  it("won't compare until both sides have enough", () => {
    const r = adjudicationSplit([...rows(20, 85, 12, "self"), ...rows(2, 85, 1, "external")], 0);
    expect(r.comparable).toBe(false);
  });

  it("finds the flattery when self-graded outcomes run kinder", () => {
    // Says 85 both times; marks itself right 90% of the time, and something
    // else marks it right 40% of the time.
    const r = adjudicationSplit(
      [...rows(20, 85, 18, "self"), ...rows(20, 85, 8, "external")],
      0
    );
    expect(r.comparable).toBe(true);
    expect(r.difference).toBeLessThan(-40);
  });

  it("reports no difference when the two agree", () => {
    const r = adjudicationSplit(
      [...rows(10, 80, 6, "self"), ...rows(10, 80, 6, "external")],
      0
    );
    expect(r.difference).toBe(0);
  });

  it("ignores entries with no outcome recorded", () => {
    const r = adjudicationSplit(
      [...rows(5, 80, 3, "self"), { confidence: 90, outcome: null, adjudication: "self" }],
      0
    );
    expect(r.self.n).toBe(5);
  });

  it("carries the count of checks still waiting", () => {
    expect(adjudicationSplit([], 3).pendingChecks).toBe(3);
  });
});
