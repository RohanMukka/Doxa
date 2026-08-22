import { describe, expect, it } from "vitest";
import { interrogateReasoning } from "./interrogation";

describe("interrogateReasoning", () => {
  it("generates a challenge quoting the user phrasing and proposing recalibration", async () => {
    const result = await interrogateReasoning({
      decision: "Invest all savings into cryptocurrency.",
      reasoning: "I've thought about this a lot and I don't need to run this by anyone. I'm confident it will double.",
      confidence: 92,
      category: "money",
      consultedOthers: false,
    });

    expect(result.challenge).toBeDefined();
    expect(result.challenge.length).toBeGreaterThan(20);
    expect(result.suggestedCalibration).toBeLessThanOrEqual(92);
    expect(result.gapPoints).toBeGreaterThanOrEqual(0);
    expect(result.citedPhrases.length).toBeGreaterThan(0);
  });
});
