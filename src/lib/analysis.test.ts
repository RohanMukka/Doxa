import { describe, expect, it } from "vitest";
import { InsightsSchema } from "./analysis";

/**
 * The contract between the model's JSON and the app. A response schema is sent
 * with the request, but a schema the provider is *asked* to honour is not a
 * guarantee, so the parse is the thing that actually protects the UI — these
 * pin what it accepts and what it refuses. No API key involved.
 */

// Shape of a real gemini-3.6-flash response, trimmed.
const realResponse = {
  insights: [
    {
      headline:
        "Your certainty is highest exactly where you skip outside input, creating a 33-percentage-point accuracy collapse.",
      evidence:
        "On the 11 decisions rated 85%+ that you reasoned through alone, you were right only 55% of the time, compared to 88% accuracy on the 8 high-confidence decisions you talked through.",
      tryInstead:
        "Require yourself to talk through any decision rated 85% or higher with an outside person before finalizing it.",
    },
  ],
};

describe("InsightsSchema", () => {
  it("accepts a real model response", () => {
    const parsed = InsightsSchema.safeParse(realResponse);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.insights).toHaveLength(1);
      expect(parsed.data.insights[0].headline).toContain("outside input");
    }
  });

  it("accepts an empty insight list", () => {
    // The model can legitimately find nothing; that isn't a parse failure.
    expect(InsightsSchema.safeParse({ insights: [] }).success).toBe(true);
  });

  it("rejects a response missing the insights key", () => {
    expect(InsightsSchema.safeParse({}).success).toBe(false);
    expect(InsightsSchema.safeParse({ results: [] }).success).toBe(false);
  });

  it("rejects an insight missing a required field", () => {
    for (const drop of ["headline", "evidence", "tryInstead"] as const) {
      const insight: Record<string, string> = { ...realResponse.insights[0] };
      delete insight[drop];
      expect(
        InsightsSchema.safeParse({ insights: [insight] }).success,
        `should reject a missing ${drop}`
      ).toBe(false);
    }
  });

  it("rejects a field of the wrong type", () => {
    expect(
      InsightsSchema.safeParse({
        insights: [{ ...realResponse.insights[0], headline: 42 }],
      }).success
    ).toBe(false);
  });

  it("rejects insights that aren't a list", () => {
    expect(InsightsSchema.safeParse({ insights: realResponse.insights[0] }).success).toBe(false);
    expect(InsightsSchema.safeParse({ insights: null }).success).toBe(false);
  });

  it("rejects prose returned instead of JSON", () => {
    // A model ignoring the response schema and answering in prose is the
    // failure this guards; the UI shows an error rather than crashing.
    expect(InsightsSchema.safeParse("You tend to be overconfident.").success).toBe(false);
  });
});
