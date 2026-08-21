import { describe, expect, it } from "vitest";
import { poolCategories, worstCategory } from "./pooling";
import type { ResolvedEntry } from "./calibration";

const rows = (
  category: string,
  correct: number,
  incorrect: number,
  confidence = 75
): ResolvedEntry[] => [
  ...Array.from({ length: correct }, () => ({
    confidence,
    outcome: "correct",
    consultedOthers: false,
    category,
  })),
  ...Array.from({ length: incorrect }, () => ({
    confidence,
    outcome: "incorrect",
    consultedOthers: false,
    category,
  })),
];

describe("poolCategories", () => {
  it("returns nothing for an empty journal", () => {
    expect(poolCategories([])).toBeNull();
  });

  it("pulls a tiny category hard towards the overall rate", () => {
    // Three decisions that all went well is not a 100% category.
    const data = [...rows("career", 12, 12), ...rows("daily", 3, 0)];
    const result = poolCategories(data)!;
    const daily = result.categories.find((c) => c.category === "daily")!;

    expect(daily.raw).toBe(100);
    expect(daily.pooled).toBeLessThan(85);
    expect(daily.pooled).toBeGreaterThan(result.overall - 1);
  });

  it("barely moves a category with plenty of evidence", () => {
    const data = [...rows("career", 30, 30), ...rows("money", 5, 5)];
    const result = poolCategories(data)!;
    const career = result.categories.find((c) => c.category === "career")!;
    expect(Math.abs(career.pooled - career.raw)).toBeLessThan(8);
    expect(career.shrinkage).toBeLessThan(
      result.categories.find((c) => c.category === "money")!.shrinkage
    );
  });

  it("collapses everything to the overall rate when the spread is just noise", () => {
    // Four categories all sitting near 50%, differing only by sampling.
    const data = [
      ...rows("a", 5, 5),
      ...rows("b", 6, 4),
      ...rows("c", 4, 6),
      ...rows("d", 5, 5),
    ];
    const result = poolCategories(data)!;
    for (const c of result.categories) {
      expect(Math.abs(c.pooled - result.overall)).toBeLessThan(6);
    }
  });

  it("lets genuinely different categories keep their own answer", () => {
    const data = [
      ...rows("great", 28, 2),
      ...rows("awful", 2, 28),
      ...rows("middling", 15, 15),
    ];
    const result = poolCategories(data)!;
    const great = result.categories.find((c) => c.category === "great")!;
    const awful = result.categories.find((c) => c.category === "awful")!;
    expect(great.pooled).toBeGreaterThan(80);
    expect(awful.pooled).toBeLessThan(20);
  });

  it("shrinks more the smaller the category, always", () => {
    const data = [...rows("big", 20, 20), ...rows("mid", 8, 8), ...rows("small", 2, 2)];
    const result = poolCategories(data)!;
    const by = (n: string) => result.categories.find((c) => c.category === n)!.shrinkage;
    expect(by("small")).toBeGreaterThan(by("mid"));
    expect(by("mid")).toBeGreaterThan(by("big"));
  });

  it("keeps pooled rates inside the scale", () => {
    const data = [...rows("x", 9, 0), ...rows("y", 0, 9)];
    const result = poolCategories(data)!;
    for (const c of result.categories) {
      expect(c.pooled).toBeGreaterThanOrEqual(0);
      expect(c.pooled).toBeLessThanOrEqual(100);
    }
  });

  it("files uncategorised entries together rather than dropping them", () => {
    const data = [
      ...rows("career", 3, 3),
      { confidence: 70, outcome: "correct", consultedOthers: false, category: null },
      { confidence: 70, outcome: "incorrect", consultedOthers: false, category: "  " },
    ];
    const result = poolCategories(data)!;
    expect(result.categories.find((c) => c.category === "uncategorised")!.count).toBe(2);
  });
});

describe("worstCategory", () => {
  it("does not let a three-decision fluke win", () => {
    // "daily" is off by 25 raw points but on almost no evidence; "career" is
    // off by less per decision but on plenty.
    const data = [
      ...rows("career", 8, 22, 80),
      ...rows("daily", 2, 1, 75),
    ];
    const result = poolCategories(data)!;
    expect(worstCategory(result)!.category).toBe("career");
  });

  it("says nothing when there is only one category", () => {
    expect(worstCategory(poolCategories(rows("solo", 5, 5))!)).toBeNull();
  });
});
