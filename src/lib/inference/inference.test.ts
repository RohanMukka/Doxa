import { describe, expect, it } from "vitest";
import { toGeminiSchema, type JsonSchema } from "./types";

describe("toGeminiSchema", () => {
  const schema: JsonSchema = {
    type: "object",
    properties: {
      insights: {
        type: "array",
        items: {
          type: "object",
          properties: {
            headline: { type: "string", description: "The finding." },
            evidence: { type: "string" },
          },
          required: ["headline", "evidence"],
        },
      },
    },
    required: ["insights"],
  };

  it("upper-cases types at every depth", () => {
    const g = toGeminiSchema(schema) as Record<string, never>;
    expect(g.type).toBe("OBJECT");
    const insights = (g.properties as Record<string, Record<string, unknown>>).insights;
    expect(insights.type).toBe("ARRAY");
    expect((insights.items as Record<string, unknown>).type).toBe("OBJECT");
  });

  it("derives propertyOrdering from declaration order", () => {
    // Gemini follows this when generating, and a mismatch against the order the
    // prompt describes tends to produce malformed output — so it is derived
    // rather than written out by hand where it could drift.
    const g = toGeminiSchema(schema) as Record<string, never>;
    const insights = (g.properties as Record<string, Record<string, unknown>>).insights;
    expect((insights.items as Record<string, unknown>).propertyOrdering).toEqual([
      "headline",
      "evidence",
    ]);
  });

  it("keeps descriptions and required lists", () => {
    const g = toGeminiSchema(schema) as Record<string, never>;
    expect(g.required).toEqual(["insights"]);
    const items = ((g.properties as Record<string, Record<string, unknown>>).insights
      .items as Record<string, Record<string, Record<string, unknown>>>);
    expect(items.properties.headline.description).toBe("The finding.");
  });
});
