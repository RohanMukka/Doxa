import { describe, expect, it } from "vitest";
import { PROPOSAL_SYSTEM, parseProposals, toCandidates } from "./propose";
import { matches, type Subject } from "./predicate";

const proposal = (predicate: unknown) => ({
  headline: "Saying you thought about it a lot stands in for having checked.",
  evidence: "On the 11 entries containing that phrase you were right 55% of the time.",
  tryInstead: "Before deciding, write down what you actually checked.",
  predicate,
});

describe("parseProposals", () => {
  it("accepts a predicate returned as a JSON string", () => {
    const [p] = parseProposals({
      hypotheses: [proposal('{"field":"confidence","op":"gte","value":85}')],
    });
    expect(p.predicate).toEqual({ field: "confidence", op: "gte", value: 85 });
  });

  it("accepts a predicate returned as an object", () => {
    const [p] = parseProposals({
      hypotheses: [proposal({ field: "consultedOthers", eq: false })],
    });
    expect(p.predicate).toEqual({ field: "consultedOthers", eq: false });
  });

  it("rejects a response missing the prose a claim needs", () => {
    expect(() => parseProposals({ hypotheses: [{ headline: "x" }] })).toThrow();
    expect(() => parseProposals({ nope: [] })).toThrow();
  });

  it("survives a predicate that isn't valid JSON", () => {
    // Kept rather than thrown, so one bad row doesn't lose the whole batch.
    const [p] = parseProposals({ hypotheses: [proposal("{not json")] });
    expect(p.predicate).toBeTruthy();
  });
});

describe("toCandidates", () => {
  it("keeps well-formed proposals, with their prose", () => {
    const { candidates, discarded } = toCandidates(
      parseProposals({
        hypotheses: [proposal('{"field":"confidence","op":"gte","value":85}')],
      })
    );
    expect(discarded).toBe(0);
    expect(candidates[0].source).toBe("model");
    expect(candidates[0].tryInstead).toMatch(/write down/);
  });

  it("discards a malformed predicate instead of repairing it", () => {
    // Repairing one would mean testing something the model didn't say.
    const { candidates, discarded } = toCandidates(
      parseProposals({
        hypotheses: [
          proposal("{not json"),
          proposal('{"field":"vibes","op":"gte","value":1}'),
          proposal('{"field":"consultedOthers","eq":false}'),
        ],
      })
    );
    expect(discarded).toBe(2);
    expect(candidates).toHaveLength(1);
  });

  it("produces predicates that actually run", () => {
    const { candidates } = toCandidates(
      parseProposals({
        hypotheses: [
          proposal(
            '{"all":[{"field":"confidence","op":"gte","value":85},{"field":"reasoningContains","anyOf":["thought about this a lot"]}]}'
          ),
        ],
      })
    );
    const hit: Subject = {
      confidence: 90,
      outcome: "incorrect",
      consultedOthers: false,
      category: "career",
      reasoning: "I've thought about this a lot and I'm sure.",
    };
    expect(matches(candidates[0].predicate, hit)).toBe(true);
    expect(matches(candidates[0].predicate, { ...hit, confidence: 60 })).toBe(false);
  });
});

describe("PROPOSAL_SYSTEM", () => {
  it("tells the model the entries it sees are only the earlier ones", () => {
    expect(PROPOSAL_SYSTEM).toMatch(/held back/i);
    expect(PROPOSAL_SYSTEM).toMatch(/have not seen/i);
  });

  it("documents every feature the predicate vocabulary allows", () => {
    for (const name of ["hedging", "absolutes", "evidenceMarkers", "wordCount"]) {
      expect(PROPOSAL_SYSTEM).toContain(name);
    }
  });
});
