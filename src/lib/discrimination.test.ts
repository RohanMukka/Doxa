import { describe, expect, it } from "vitest";
import {
  decomposeBrier,
  discrimination,
  discriminationInterval,
  verdict,
} from "./discrimination";
import type { ResolvedEntry } from "./calibration";

const entry = (confidence: number, outcome: string): ResolvedEntry => ({
  confidence,
  outcome,
  consultedOthers: false,
  category: null,
});

describe("decomposeBrier", () => {
  it("returns nothing for an empty journal", () => {
    expect(decomposeBrier([])).toBeNull();
  });

  it("satisfies BS = reliability - resolution + uncertainty", () => {
    const rows = [
      entry(90, "correct"), entry(85, "incorrect"), entry(70, "correct"),
      entry(60, "correct"), entry(45, "incorrect"), entry(30, "incorrect"),
      entry(95, "correct"), entry(75, "incorrect"), entry(55, "correct"),
    ];
    const p = decomposeBrier(rows)!;
    expect(p.reliability - p.resolution + p.uncertainty).toBeCloseTo(p.brier, 10);
  });

  it("scores a perfectly calibrated, perfectly sharp forecaster at zero reliability", () => {
    // Says 100 when right and 0 when wrong: no miscalibration, maximum
    // separation from the base rate.
    const rows = [
      entry(100, "correct"), entry(100, "correct"),
      entry(0, "incorrect"), entry(0, "incorrect"),
    ];
    const p = decomposeBrier(rows)!;
    expect(p.reliability).toBeCloseTo(0, 6);
    expect(p.resolution).toBeCloseTo(p.uncertainty, 6);
    expect(p.brier).toBeCloseTo(0, 6);
  });

  it("gives zero resolution to someone who says the same thing every time", () => {
    // The case the old dashboard couldn't see: honest, and carrying no
    // information at all.
    const rows = [
      entry(50, "correct"), entry(50, "incorrect"),
      entry(50, "correct"), entry(50, "incorrect"),
    ];
    const p = decomposeBrier(rows)!;
    expect(p.resolution).toBeCloseTo(0, 6);
    expect(p.reliability).toBeCloseTo(0, 6);
    expect(p.brier).toBeCloseTo(0.25, 6);
  });

  it("charges reliability to someone confident and wrong", () => {
    const rows = [
      entry(95, "incorrect"), entry(95, "incorrect"),
      entry(95, "correct"), entry(95, "incorrect"),
    ];
    const p = decomposeBrier(rows)!;
    expect(p.reliability).toBeGreaterThan(0.4);
  });

  it("does not charge uncertainty against the forecaster", () => {
    // Uncertainty depends only on the base rate — the difficulty of what you
    // chose to predict, not on how you predicted it.
    const easy = decomposeBrier([
      entry(90, "correct"), entry(80, "correct"), entry(70, "correct"), entry(60, "correct"),
    ])!;
    expect(easy.uncertainty).toBeCloseTo(0, 6);
  });
});

describe("discrimination", () => {
  it("returns nothing when every decision went the same way", () => {
    expect(discrimination([entry(80, "correct"), entry(70, "correct")])).toBeNull();
  });

  it("is 1 when confidence perfectly separates right from wrong", () => {
    expect(
      discrimination([entry(90, "correct"), entry(80, "correct"), entry(30, "incorrect")])
    ).toBe(1);
  });

  it("is 0 when confidence separates them backwards", () => {
    expect(discrimination([entry(20, "correct"), entry(90, "incorrect")])).toBe(0);
  });

  it("counts ties as half, since stated confidences pile up on round numbers", () => {
    expect(discrimination([entry(70, "correct"), entry(70, "incorrect")])).toBe(0.5);
  });

  it("sits at chance when confidence carries nothing", () => {
    const rows = [
      entry(80, "correct"), entry(80, "incorrect"),
      entry(60, "correct"), entry(60, "incorrect"),
    ];
    expect(discrimination(rows)).toBe(0.5);
  });
});

describe("discriminationInterval", () => {
  it("is deterministic", () => {
    const rows = [
      entry(90, "correct"), entry(80, "correct"), entry(70, "incorrect"),
      entry(60, "correct"), entry(40, "incorrect"), entry(30, "incorrect"),
    ];
    expect(discriminationInterval(rows)).toEqual(discriminationInterval(rows));
  });

  it("does not collapse under perfect separation", () => {
    // A bootstrap returns [1, 1] here, because every resample also separates
    // perfectly. That would let four decisions be reported as proven skill.
    const rows = [
      entry(90, "correct"), entry(85, "correct"),
      entry(30, "incorrect"), entry(25, "incorrect"),
    ];
    const r = discriminationInterval(rows)!;
    expect(r.auc).toBe(1);
    expect(r.low).toBeLessThan(1);
  });

  it("treats a lopsided journal as only as strong as its smaller side", () => {
    // Twenty rights and one wrong is one wrong decision's worth of evidence.
    const rows = [
      ...Array.from({ length: 20 }, () => entry(90, "correct")),
      entry(20, "incorrect"),
    ];
    const r = discriminationInterval(rows)!;
    expect(r.low).toBeLessThan(0.5);
  });

  it("narrows once there is real evidence on both sides", () => {
    const rows = [
      ...Array.from({ length: 40 }, (_, i) => entry(75 + (i % 20), "correct")),
      ...Array.from({ length: 40 }, (_, i) => entry(20 + (i % 20), "incorrect")),
    ];
    const r = discriminationInterval(rows)!;
    expect(r.low).toBeGreaterThan(0.5);
  });

  it("brackets the point estimate", () => {
    const rows = [
      entry(95, "correct"), entry(85, "correct"), entry(75, "correct"),
      entry(55, "incorrect"), entry(45, "incorrect"), entry(25, "incorrect"),
    ];
    const r = discriminationInterval(rows)!;
    expect(r.low).toBeLessThanOrEqual(r.auc);
    expect(r.auc).toBeLessThanOrEqual(r.high);
  });

  it("keeps chance inside the interval at small n, however clean the split looks", () => {
    // Four decisions that separate perfectly still aren't evidence of skill.
    const rows = [entry(90, "correct"), entry(85, "correct"), entry(30, "incorrect"), entry(25, "incorrect")];
    const r = discriminationInterval(rows)!;
    expect(r.low).toBeLessThanOrEqual(0.5);
  });

  it("brackets a coin-flip forecaster around chance", () => {
    const rows = [
      entry(80, "correct"), entry(80, "incorrect"),
      entry(60, "correct"), entry(60, "incorrect"),
    ];
    const r = discriminationInterval(rows)!;
    expect(r.auc).toBe(0.5);
    expect(r.low).toBeLessThan(0.5);
    expect(r.high).toBeGreaterThan(0.5);
  });
});

describe("verdict", () => {
  const parts = (reliability: number) => ({
    brier: 0.2,
    reliability,
    resolution: 0.05,
    uncertainty: 0.25,
  });

  it("separates honest-but-vague from informative-but-misscaled", () => {
    expect(verdict(parts(0.001), { auc: 0.52, low: 0.4, high: 0.62 })).toBe(
      "honest-but-vague"
    );
    expect(verdict(parts(0.15), { auc: 0.8, low: 0.62, high: 0.93 })).toBe(
      "informative-but-misscaled"
    );
  });

  it("only calls someone sharp when the interval clears chance", () => {
    expect(verdict(parts(0.001), { auc: 0.8, low: 0.66, high: 0.92 })).toBe(
      "sharp-and-honest"
    );
    expect(verdict(parts(0.001), { auc: 0.8, low: 0.48, high: 0.95 })).toBe(
      "honest-but-vague"
    );
  });

  it("distinguishes having no data from having measured and found nothing", () => {
    // Telling someone with forty resolved decisions to "keep resolving" reads
    // as though nothing was measured. These are different answers.
    expect(verdict(null, null)).toBe("no-data");
    expect(verdict(parts(0.15), { auc: 0.55, low: 0.3, high: 0.78 })).toBe(
      "misscaled-and-unproven"
    );
  });
});
