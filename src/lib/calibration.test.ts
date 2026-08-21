import { describe, expect, it } from "vitest";
import {
  accuracyFor,
  averageConfidence,
  brierScore,
  byCategory,
  calibrationCurve,
  calibrationGap,
  expectedCalibrationError,
  gapIsMeaningful,
  hindsight,
  hindsightSignificance,
  mostMiscalibratedCategory,
  splitByConsultation,
  wilsonInterval,
  type ResolvedEntry,
} from "./calibration";

/** Build n entries at a given confidence, `correct` of which came true. */
function entries(
  confidence: number,
  total: number,
  correct: number,
  consultedOthers = false
): ResolvedEntry[] {
  return Array.from({ length: total }, (_, i) => ({
    confidence,
    outcome: i < correct ? "correct" : "incorrect",
    consultedOthers,
    category: null,
  }));
}

describe("accuracyFor", () => {
  it("returns null with nothing resolved", () => {
    expect(accuracyFor([])).toBeNull();
  });

  it("counts only outcomes marked correct", () => {
    expect(accuracyFor(entries(80, 4, 3))).toBe(75);
  });

  it("treats an unresolved outcome as not correct", () => {
    const rows: ResolvedEntry[] = [
      { confidence: 80, outcome: null, consultedOthers: false, category: null },
      { confidence: 80, outcome: "correct", consultedOthers: false, category: null },
    ];
    expect(accuracyFor(rows)).toBe(50);
  });
});

describe("averageConfidence", () => {
  it("returns null with nothing resolved", () => {
    expect(averageConfidence([])).toBeNull();
  });

  it("rounds to the nearest point", () => {
    // (70 + 71) / 2 = 70.5 → 71
    const rows = [...entries(70, 1, 1), ...entries(71, 1, 1)];
    expect(averageConfidence(rows)).toBe(71);
  });
});

describe("calibrationGap", () => {
  it("is positive when confidence outruns the hit rate", () => {
    expect(calibrationGap(entries(90, 10, 5))).toBe(40);
  });

  it("is negative when the hit rate outruns confidence", () => {
    expect(calibrationGap(entries(50, 10, 9))).toBe(-40);
  });

  it("is zero for someone perfectly calibrated", () => {
    expect(calibrationGap(entries(70, 10, 7))).toBe(0);
  });

  it("is zero for a low-confidence forecaster who is right that rarely", () => {
    // Saying 30% and being right 30% of the time is GOOD calibration,
    // not a failure — the metric must not punish it.
    expect(calibrationGap(entries(30, 10, 3))).toBe(0);
  });
});

describe("expectedCalibrationError", () => {
  it("returns null with nothing resolved", () => {
    expect(expectedCalibrationError([])).toBeNull();
  });

  it("is zero for a perfectly calibrated record", () => {
    expect(expectedCalibrationError(entries(70, 10, 7))).toBe(0);
  });

  it("catches miscalibration that the signed gap cancels away", () => {
    // Wildly overconfident at the top, equally underconfident at the bottom.
    const rows = [
      ...entries(90, 10, 5), // said 90, right 50 → 40 points over
      ...entries(30, 10, 7), // said 30, right 70 → 40 points under
    ];

    // The signed gap cancels to nothing and reports a calibrated person...
    expect(calibrationGap(rows)).toBe(0);
    // ...while ECE correctly reports someone badly calibrated in both directions.
    expect(expectedCalibrationError(rows)).toBe(40);
  });
});

describe("brierScore", () => {
  it("returns null with nothing resolved", () => {
    expect(brierScore([])).toBeNull();
  });

  it("is 0 for perfect confident predictions", () => {
    expect(brierScore(entries(100, 5, 5))).toBe(0);
  });

  it("is 1 for maximally confident and maximally wrong", () => {
    expect(brierScore(entries(100, 5, 0))).toBe(1);
  });

  it("is 0.25 for hedging everything at 50%", () => {
    expect(brierScore(entries(50, 8, 4))).toBe(0.25);
  });

  it("punishes a confident miss harder than a hedged one", () => {
    const confidentMiss = brierScore(entries(95, 1, 0))!;
    const hedgedMiss = brierScore(entries(55, 1, 0))!;
    expect(confidentMiss).toBeGreaterThan(hedgedMiss);
  });
});

describe("wilsonInterval", () => {
  it("spans the whole range when nothing has resolved", () => {
    expect(wilsonInterval(0, 0)).toEqual({ low: 0, high: 100 });
  });

  it("stays inside [0,100] even at the extremes", () => {
    const { low, high } = wilsonInterval(5, 5);
    expect(low).toBeGreaterThanOrEqual(0);
    expect(high).toBeLessThanOrEqual(100);
  });

  it("narrows as the sample grows", () => {
    const small = wilsonInterval(3, 6);
    const large = wilsonInterval(50, 100);
    expect(large.high - large.low).toBeLessThan(small.high - small.low);
  });

  it("brackets the observed rate", () => {
    const { low, high } = wilsonInterval(7, 10);
    expect(low).toBeLessThanOrEqual(70);
    expect(high).toBeGreaterThanOrEqual(70);
  });
});

describe("calibrationCurve", () => {
  it("drops buckets with nothing in them", () => {
    expect(calibrationCurve(entries(90, 3, 2))).toHaveLength(1);
  });

  it("places entries in the right bucket at the boundaries", () => {
    const boundaries = [
      { confidence: 39, label: "0-39%" },
      { confidence: 40, label: "40-54%" },
      { confidence: 54, label: "40-54%" },
      { confidence: 55, label: "55-69%" },
      { confidence: 69, label: "55-69%" },
      { confidence: 70, label: "70-84%" },
      { confidence: 84, label: "70-84%" },
      { confidence: 85, label: "85-100%" },
    ];

    for (const { confidence, label } of boundaries) {
      const [bucket] = calibrationCurve(entries(confidence, 1, 1));
      expect(bucket.label, `confidence ${confidence}`).toBe(label);
    }
  });

  it("reports stated confidence and hit rate per bucket", () => {
    const [bucket] = calibrationCurve(entries(90, 10, 6));
    expect(bucket.statedConfidence).toBe(90);
    expect(bucket.actualAccuracy).toBe(60);
    expect(bucket.count).toBe(10);
  });

  it("flags a bucket too thin to read anything into", () => {
    const [thin] = calibrationCurve(entries(90, 3, 2));
    expect(thin.thin).toBe(true);

    const [solid] = calibrationCurve(entries(90, 20, 12));
    expect(solid.thin).toBe(false);
  });

  it("attaches an interval that brackets the hit rate", () => {
    const [bucket] = calibrationCurve(entries(90, 10, 6));
    expect(bucket.low).toBeLessThanOrEqual(bucket.actualAccuracy);
    expect(bucket.high).toBeGreaterThanOrEqual(bucket.actualAccuracy);
  });
});

describe("gapIsMeaningful", () => {
  it("is false when nothing has resolved", () => {
    expect(gapIsMeaningful([])).toBe(false);
  });

  it("is false for a small sample with a modest gap", () => {
    // 10 decisions, 10-point gap — well inside the noise at this sample size.
    expect(gapIsMeaningful(entries(70, 10, 6))).toBe(false);
  });

  it("is true for a large gap that the sample can actually support", () => {
    expect(gapIsMeaningful(entries(95, 60, 20))).toBe(true);
  });
});

describe("splitByConsultation", () => {
  it("separates solo from talked-through decisions", () => {
    const rows = [...entries(80, 3, 2, false), ...entries(80, 2, 2, true)];
    const { solo, consulted } = splitByConsultation(rows);
    expect(solo).toHaveLength(3);
    expect(consulted).toHaveLength(2);
  });

  it("returns empty halves for an empty journal", () => {
    const { solo, consulted } = splitByConsultation([]);
    expect(solo).toEqual([]);
    expect(consulted).toEqual([]);
  });
});

describe("byCategory", () => {
  it("groups, sorts by size, and flags thin categories", () => {
    const rows: ResolvedEntry[] = [
      ...entries(90, 6, 3).map((e) => ({ ...e, category: "career" })),
      ...entries(80, 2, 2).map((e) => ({ ...e, category: "money" })),
    ];
    const [first, second] = byCategory(rows);

    expect(first.category).toBe("career");
    expect(first.count).toBe(6);
    expect(first.thin).toBe(false);
    expect(first.stated).toBe(90);
    expect(first.actual).toBe(50);

    expect(second.category).toBe("money");
    expect(second.thin).toBe(true);
  });

  it("buckets uncategorised entries together rather than dropping them", () => {
    const rows: ResolvedEntry[] = [
      ...entries(70, 2, 1),
      ...entries(70, 1, 1).map((e) => ({ ...e, category: "  " })),
    ];
    const groups = byCategory(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe("uncategorised");
    expect(groups[0].count).toBe(3);
  });

  it("returns nothing for an empty journal", () => {
    expect(byCategory([])).toEqual([]);
  });
});

describe("mostMiscalibratedCategory", () => {
  it("picks the category with the largest calibration error", () => {
    const rows: ResolvedEntry[] = [
      // career: said 90, right 33 → badly off
      ...entries(90, 6, 2).map((e) => ({ ...e, category: "career" })),
      // money: said 70, right 67 → close
      ...entries(70, 6, 4).map((e) => ({ ...e, category: "money" })),
    ];
    expect(mostMiscalibratedCategory(rows)?.category).toBe("career");
  });

  it("ignores categories too thin to rank", () => {
    const rows: ResolvedEntry[] = [
      // health is wildly off but has only 2 entries — must not be named
      ...entries(95, 2, 0).map((e) => ({ ...e, category: "health" })),
      ...entries(90, 6, 2).map((e) => ({ ...e, category: "career" })),
      ...entries(70, 6, 4).map((e) => ({ ...e, category: "money" })),
    ];
    expect(mostMiscalibratedCategory(rows)?.category).toBe("career");
  });

  it("returns null when fewer than two categories clear the bar", () => {
    expect(mostMiscalibratedCategory(entries(90, 10, 5))).toBeNull();
    expect(mostMiscalibratedCategory([])).toBeNull();
  });
});

describe("hindsight", () => {
  const recall = (
    confidence: number,
    recalledConfidence: number | null,
    outcome: string,
    recallBlind: boolean | null = true
  ) => ({ confidence, recalledConfidence, recallBlind, outcome });

  it("ignores recalls taken after the stored figure was revealed", () => {
    const stats = hindsight([
      recall(80, 90, "correct", true),
      recall(80, 95, "correct", false),
      recall(80, 99, "correct", null),
    ]);
    expect(stats!.n).toBe(1);
  });

  it("ignores entries where no recall was given at all", () => {
    expect(hindsight([recall(80, null, "correct")])).toBeNull();
  });

  it("reports drift signed towards inflation", () => {
    const stats = hindsight([recall(70, 80, "correct"), recall(70, 76, "correct")])!;
    expect(stats.drift).toBe(8);
  });

  it("separates misremembering from bending towards the outcome", () => {
    // Remembering every figure as 10 points higher is a bad memory for numbers,
    // not hindsight bias: the spread between the outcome groups is zero.
    const uniform = hindsight([
      recall(70, 80, "correct"),
      recall(60, 70, "incorrect"),
    ])!;
    expect(uniform.drift).toBe(10);
    expect(uniform.outcomeSpread).toBe(0);

    const bending = hindsight([
      recall(70, 80, "correct"),
      recall(60, 50, "incorrect"),
    ])!;
    expect(bending.drift).toBe(0);
    expect(bending.outcomeSpread).toBe(20);
  });

  it("measures how badly the number is remembered, direction aside", () => {
    const stats = hindsight([recall(70, 80, "correct"), recall(70, 60, "incorrect")])!;
    expect(stats.drift).toBe(0);
    expect(stats.meanAbsError).toBe(10);
  });
});

describe("hindsightSignificance", () => {
  const rows = (specs: [number, number, string][]) =>
    specs.map(([confidence, recalledConfidence, outcome]) => ({
      confidence,
      recalledConfidence,
      recallBlind: true,
      outcome,
    }));

  it("returns nothing when one outcome group is empty", () => {
    expect(
      hindsightSignificance(rows([[70, 80, "correct"], [60, 70, "correct"]]))
    ).toBeNull();
  });

  it("is deterministic, so a p-value doesn't move between renders", () => {
    const data = rows([
      [70, 85, "correct"], [80, 88, "correct"], [60, 70, "correct"],
      [90, 80, "incorrect"], [70, 55, "incorrect"], [85, 70, "incorrect"],
    ]);
    const a = hindsightSignificance(data);
    const b = hindsightSignificance(data);
    expect(a).toEqual(b);
  });

  it("finds a planted effect that is far too clean to be chance", () => {
    const data = rows([
      ...Array.from({ length: 10 }, (_, i) => [70, 90 + (i % 3), "correct"] as [number, number, string]),
      ...Array.from({ length: 10 }, (_, i) => [70, 50 + (i % 3), "incorrect"] as [number, number, string]),
    ]);
    const result = hindsightSignificance(data)!;
    expect(result.spread).toBeGreaterThan(35);
    expect(result.p).toBeLessThan(0.01);
  });

  it("refuses to call an effect when the drift is unrelated to the outcome", () => {
    // Both groups draw from near-identical drifts, so knowing the outcome tells
    // you almost nothing about how the confidence was misremembered. Plenty of
    // scatter, no signal — the case where a naive difference-of-means invites
    // you to read something into noise.
    const data = rows([
      ...([10, -6, 3, -2, 8, -9] as number[]).map(
        (d) => [70, 70 + d, "correct"] as [number, number, string]
      ),
      ...([9, -7, 4, -3, 7, -8] as number[]).map(
        (d) => [70, 70 + d, "incorrect"] as [number, number, string]
      ),
    ]);
    const result = hindsightSignificance(data)!;
    expect(Math.abs(result.spread)).toBeLessThan(2);
    expect(result.p).toBeGreaterThan(0.5);
  });

  it("never reports a p-value of zero, which no finite shuffle can support", () => {
    const data = rows([
      ...Array.from({ length: 12 }, () => [70, 100, "correct"] as [number, number, string]),
      ...Array.from({ length: 12 }, () => [70, 0, "incorrect"] as [number, number, string]),
    ]);
    const result = hindsightSignificance(data, 200)!;
    expect(result.p).toBeGreaterThan(0);
    expect(result.p).toBeCloseTo(1 / 201, 5);
  });
});
