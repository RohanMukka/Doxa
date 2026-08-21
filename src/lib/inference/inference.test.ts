import { describe, expect, it } from "vitest";
import { chooseBackend, type Availability } from "./index";
import { toGeminiSchema, type JsonSchema } from "./types";

const base: Availability = {
  localAvailable: false,
  cloudConfigured: false,
  cloudConsented: false,
};

describe("chooseBackend", () => {
  it("prefers the local model when one is reachable", () => {
    const c = chooseBackend({ ...base, localAvailable: true, cloudConfigured: true });
    expect(c).toEqual({ ok: true, backend: "ollama", local: true });
  });

  it("still prefers local when the cloud has been consented to", () => {
    // Consent means "you may, if you must" — not "please do".
    const c = chooseBackend({
      ...base,
      localAvailable: true,
      cloudConfigured: true,
      cloudConsented: true,
    });
    expect(c).toMatchObject({ backend: "ollama" });
  });

  it("never falls back to the cloud just because local is missing", () => {
    const c = chooseBackend({ ...base, cloudConfigured: true });
    expect(c).toMatchObject({ ok: false, reason: "cloud-not-consented" });
  });

  it("uses the cloud only once this run has been consented to", () => {
    const c = chooseBackend({ ...base, cloudConfigured: true, cloudConsented: true });
    expect(c).toEqual({ ok: true, backend: "gemini", local: false });
  });

  it("refuses when there is nothing to run on", () => {
    expect(chooseBackend(base)).toMatchObject({ ok: false, reason: "nothing-available" });
  });

  it("says how to get a local model when it refuses", () => {
    const c = chooseBackend({ ...base, cloudConfigured: true });
    if (c.ok) throw new Error("expected a refusal");
    expect(c.error).toMatch(/ollama pull/i);
  });

  describe('with DOXA_INFERENCE="local"', () => {
    it("runs locally", () => {
      const c = chooseBackend({ ...base, preference: "local", localAvailable: true });
      expect(c).toMatchObject({ backend: "ollama" });
    });

    it("fails rather than quietly using the cloud instead", () => {
      const c = chooseBackend({
        ...base,
        preference: "local",
        cloudConfigured: true,
        cloudConsented: true,
      });
      expect(c).toMatchObject({ ok: false, reason: "no-local" });
    });
  });

  describe('with DOXA_INFERENCE="cloud"', () => {
    it("still requires consent for the run", () => {
      // Choosing a backend in config is not the same act as agreeing to send
      // your journal off the machine, so the setting cannot stand in for it.
      const c = chooseBackend({ ...base, preference: "cloud", cloudConfigured: true });
      expect(c).toMatchObject({ ok: false, reason: "cloud-not-consented" });
    });

    it("runs remotely once consented", () => {
      const c = chooseBackend({
        ...base,
        preference: "cloud",
        cloudConfigured: true,
        cloudConsented: true,
      });
      expect(c).toMatchObject({ backend: "gemini", local: false });
    });

    it("does not silently use local when no key is configured", () => {
      const c = chooseBackend({ ...base, preference: "cloud", localAvailable: true });
      expect(c).toMatchObject({ ok: false, reason: "nothing-available" });
    });
  });

  it("treats an unrecognised preference as unset", () => {
    const c = chooseBackend({ ...base, preference: "banana", localAvailable: true });
    expect(c).toMatchObject({ backend: "ollama" });
  });
});

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
