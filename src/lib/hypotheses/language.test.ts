import { describe, expect, it } from "vitest";
import { extractFeatures } from "./features";
import { PredicateSchema, describe as explain, matches, split, type Subject } from "./predicate";

const subject = (over: Partial<Subject> = {}): Subject => ({
  confidence: 80,
  outcome: "correct",
  consultedOthers: false,
  category: "career",
  reasoning: "The team is stronger and the scope is wider.",
  ...over,
});

describe("extractFeatures", () => {
  it("counts hedges per hundred words, not per entry", () => {
    const short = extractFeatures("Maybe. Probably.");
    const padded = extractFeatures(`Maybe. Probably. ${"filler ".repeat(50)}`);
    expect(short.hedging).toBeGreaterThan(padded.hedging);
  });

  it("separates hedging from asserted certainty", () => {
    const hedged = extractFeatures("I think this might probably work, perhaps.");
    const certain = extractFeatures("This will definitely work. Obviously. No doubt.");
    expect(hedged.hedging).toBeGreaterThan(hedged.absolutes);
    expect(certain.absolutes).toBeGreaterThan(certain.hedging);
  });

  it("notices claims of having deliberated, which are not claims of having checked", () => {
    const f = extractFeatures("I've thought about this a lot and I don't need to ask anyone.");
    expect(f.deliberationClaims).toBeGreaterThan(0);
    expect(f.evidenceMarkers).toBe(0);
  });

  it("notices having actually checked", () => {
    const f = extractFeatures("I compared the numbers against last time and looked up the data.");
    expect(f.evidenceMarkers).toBeGreaterThan(0);
  });

  it("is case-insensitive and survives odd whitespace", () => {
    const a = extractFeatures("DEFINITELY   the\n\nright call");
    expect(a.absolutes).toBeGreaterThan(0);
  });

  it("handles an empty entry without dividing by zero", () => {
    const f = extractFeatures("");
    expect(f.wordCount).toBe(0);
    expect(Number.isFinite(f.hedging)).toBe(true);
    expect(f.hedging).toBe(0);
  });
});

describe("predicates", () => {
  it("matches on confidence thresholds", () => {
    const p = { field: "confidence", op: "gte", value: 85 } as const;
    expect(matches(p, subject({ confidence: 90 }))).toBe(true);
    expect(matches(p, subject({ confidence: 80 }))).toBe(false);
  });

  it("matches phrases case-insensitively", () => {
    const p = { field: "reasoningContains", anyOf: ["Thought About This"] } as const;
    expect(matches(p, subject({ reasoning: "I've thought about this a lot" }))).toBe(true);
  });

  it("matches on a computed feature", () => {
    const p = { field: "feature", name: "absolutes", op: "gte", value: 5 } as const;
    expect(matches(p, subject({ reasoning: "Definitely. Obviously." }))).toBe(true);
    expect(matches(p, subject({ reasoning: "Maybe, hard to say, could go either way." }))).toBe(false);
  });

  it("composes with all, any and not", () => {
    const s = subject({ confidence: 90, consultedOthers: false });
    expect(
      matches(
        {
          all: [
            { field: "confidence", op: "gte", value: 85 },
            { field: "consultedOthers", eq: false },
          ],
        },
        s
      )
    ).toBe(true);
    expect(matches({ not: { field: "consultedOthers", eq: false } }, s)).toBe(false);
    expect(
      matches({ any: [{ field: "category", eq: "money" }, { field: "category", eq: "career" }] }, s)
    ).toBe(true);
  });

  it("splits a journal without losing or duplicating anyone", () => {
    const subjects = [
      subject({ confidence: 90 }),
      subject({ confidence: 60 }),
      subject({ confidence: 95 }),
    ];
    const { inside, outside } = split({ field: "confidence", op: "gte", value: 85 }, subjects);
    expect(inside).toHaveLength(2);
    expect(outside).toHaveLength(1);
  });

  it("rejects a malformed predicate rather than matching everything", () => {
    expect(PredicateSchema.safeParse({ field: "nonsense", eq: 1 }).success).toBe(false);
    expect(PredicateSchema.safeParse({ field: "reasoningContains", anyOf: [] }).success).toBe(false);
    expect(
      PredicateSchema.safeParse({ field: "feature", name: "vibes", op: "gte", value: 1 }).success
    ).toBe(false);
  });

  it("accepts the shapes the model is asked for", () => {
    expect(
      PredicateSchema.safeParse({
        all: [
          { field: "confidence", op: "gte", value: 85 },
          { field: "consultedOthers", eq: false },
          { field: "reasoningContains", anyOf: ["thought about this a lot"] },
        ],
      }).success
    ).toBe(true);
  });

  it("explains itself in words a person could apply by hand", () => {
    const text = explain({
      all: [
        { field: "confidence", op: "gte", value: 85 },
        { field: "consultedOthers", eq: false },
      ],
    });
    expect(text).toBe("confidence at or above 85% and reasoned alone");
  });
});
