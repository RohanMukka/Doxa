import { describe, expect, it } from "vitest";
import { parseLocalDate, validateNewEntry, validateResolution } from "./validation";

const valid = {
  decision: "Take the offer.",
  reasoning: "The team is stronger and the scope is wider.",
  confidence: "80",
  category: "career",
  consultedOthers: "on",
  resolutionDate: "2026-12-01",
  falsifier: "I'm still there in a year and wish I'd left.",
  premortem: "",
  premortemAssigned: "",
};

describe("parseLocalDate", () => {
  it("builds the date in local time, not UTC", () => {
    const d = parseLocalDate("2026-09-30")!;
    // The UTC-midnight bug shows up as the 29th west of Greenwich.
    expect(d.getDate()).toBe(30);
    expect(d.getMonth()).toBe(8);
    expect(d.getFullYear()).toBe(2026);
  });

  it("rejects a malformed string", () => {
    expect(parseLocalDate("")).toBeNull();
    expect(parseLocalDate("30-09-2026")).toBeNull();
    expect(parseLocalDate("2026-9-3")).toBeNull();
    expect(parseLocalDate("tomorrow")).toBeNull();
  });

  it("rejects a date that doesn't exist rather than rolling it over", () => {
    expect(parseLocalDate("2026-02-31")).toBeNull();
    expect(parseLocalDate("2026-13-01")).toBeNull();
  });

  it("accepts a real leap day", () => {
    expect(parseLocalDate("2028-02-29")).not.toBeNull();
  });
});

describe("validateNewEntry", () => {
  it("accepts a complete entry", () => {
    const r = validateNewEntry(valid);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.decision).toBe("Take the offer.");
      expect(r.value.confidence).toBe(80);
      expect(r.value.consultedOthers).toBe(true);
      expect(r.value.category).toBe("career");
    }
  });

  it("rejects a blank or whitespace-only decision", () => {
    for (const decision of ["", "   "]) {
      const r = validateNewEntry({ ...valid, decision });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/deciding/i);
    }
  });

  it("rejects missing reasoning, since that's what gets analysed", () => {
    const r = validateNewEntry({ ...valid, reasoning: "  " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/reasoning/i);
  });

  it("rejects a non-numeric confidence", () => {
    const r = validateNewEntry({ ...valid, confidence: "very" });
    expect(r.ok).toBe(false);
  });

  it("rejects a missing resolution date", () => {
    const r = validateNewEntry({ ...valid, resolutionDate: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/date/i);
  });

  it("clamps confidence into 0–100", () => {
    const high = validateNewEntry({ ...valid, confidence: "180" });
    const low = validateNewEntry({ ...valid, confidence: "-40" });
    if (high.ok) expect(high.value.confidence).toBe(100);
    if (low.ok) expect(low.value.confidence).toBe(0);
  });

  it("rounds a fractional confidence", () => {
    const r = validateNewEntry({ ...valid, confidence: "72.6" });
    if (r.ok) expect(r.value.confidence).toBe(73);
  });

  it("treats an empty category as absent rather than empty string", () => {
    const r = validateNewEntry({ ...valid, category: "   " });
    if (r.ok) expect(r.value.category).toBeNull();
  });

  it("defaults consultedOthers to false when the box is unchecked", () => {
    const r = validateNewEntry({ ...valid, consultedOthers: null });
    if (r.ok) expect(r.value.consultedOthers).toBe(false);
  });
});

describe("validateResolution", () => {
  it("accepts a correct outcome", () => {
    const r = validateResolution({ id: "abc", outcome: "correct", resolutionNote: "went fine", recalledConfidence: null });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.outcome).toBe("correct");
      expect(r.value.resolutionNote).toBe("went fine");
    }
  });

  it("rejects an outcome outside the two allowed values", () => {
    for (const outcome of ["", "maybe", "CORRECT", "sort of"]) {
      expect(
        validateResolution({ id: "abc", outcome, resolutionNote: "", recalledConfidence: null }).ok
      ).toBe(false);
    }
  });

  it("rejects a missing id", () => {
    expect(validateResolution({ id: "", outcome: "correct", resolutionNote: "", recalledConfidence: null }).ok).toBe(false);
  });

  it("treats an empty note as absent", () => {
    const r = validateResolution({ id: "abc", outcome: "incorrect", resolutionNote: "  ", recalledConfidence: null });
    if (r.ok) expect(r.value.resolutionNote).toBeNull();
  });
});

describe("the premortem gate", () => {
  const sure = { ...valid, confidence: "92" };

  it("demands the disconfirming case when assigned above the threshold", () => {
    const r = validateNewEntry({ ...sure, premortemAssigned: "on", premortem: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/disconfirming case/i);
  });

  it("accepts the entry once it's written", () => {
    const r = validateNewEntry({
      ...sure,
      premortemAssigned: "on",
      premortem: "The team I was counting on left.",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.premortem).toBe("The team I was counting on left.");
      expect(r.value.premortemAssigned).toBe(true);
    }
  });

  it("stays out of the way below the threshold", () => {
    const r = validateNewEntry({
      ...valid,
      confidence: "70",
      premortemAssigned: "on",
      premortem: "",
    });
    expect(r.ok).toBe(true);
  });

  it("stays out of the way for the unassigned half", () => {
    // These are the control group, and the whole reason a difference could be
    // attributed to the intervention rather than to the passage of time.
    const r = validateNewEntry({ ...sure, premortemAssigned: "", premortem: "" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.premortemAssigned).toBe(false);
  });

  it("records the assignment either way, since the skipped half is the comparison", () => {
    const on = validateNewEntry({ ...sure, premortemAssigned: "on", premortem: "x" });
    const off = validateNewEntry({ ...sure, premortemAssigned: "", premortem: "" });
    if (on.ok && off.ok) {
      expect(on.value.premortemAssigned).toBe(true);
      expect(off.value.premortemAssigned).toBe(false);
    }
  });

  it("treats whitespace as no answer", () => {
    const r = validateNewEntry({ ...sure, premortemAssigned: "on", premortem: "   " });
    expect(r.ok).toBe(false);
  });
});
