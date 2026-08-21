import { describe, expect, it } from "vitest";
import {
  DEFAULT_GRID,
  calibrationBand,
  clampProbability,
  fitRecalibration,
  logit,
  recalibrate,
  sigmoid,
  type Observation,
} from "./recalibration";

/** xorshift32 — deterministic, so every assertion here is reproducible. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 0x100000000;
  };
}

/**
 * A journal from someone whose true distortion is (a, b): they state a
 * confidence, and are actually right with probability sigma(a*logit(p)+b).
 */
function journal(a: number, b: number, n: number, seed = 7): Observation[] {
  const next = rng(seed);
  const out: Observation[] = [];
  for (let i = 0; i < n; i++) {
    const confidence = 5 + Math.floor(next() * 91);
    const truth = sigmoid(a * logit(clampProbability(confidence / 100)) + b);
    out.push({ confidence, outcome: next() < truth ? "correct" : "incorrect" });
  }
  return out;
}

describe("fitRecalibration", () => {
  it("returns nothing when there is nothing resolved", () => {
    expect(fitRecalibration([])).toBeNull();
    expect(fitRecalibration([{ confidence: 80, outcome: null }])).toBeNull();
  });

  it("recovers a known distortion", () => {
    const fit = fitRecalibration(journal(0.6, -0.3, 600))!;
    expect(fit.a.median).toBeGreaterThan(0.4);
    expect(fit.a.median).toBeLessThan(0.85);
    expect(fit.b.median).toBeGreaterThan(-0.8);
    expect(fit.b.median).toBeLessThan(0.2);
  });

  it("lands near perfect calibration when the person is calibrated", () => {
    const fit = fitRecalibration(journal(1, 0, 600))!;
    expect(fit.a.low).toBeLessThanOrEqual(1);
    expect(fit.a.high).toBeGreaterThanOrEqual(1);
    expect(fit.indistinguishableFromCalibrated).toBe(true);
  });

  it("does not claim a distortion at journal-sized n", () => {
    // Forty entries is what a real journal has, and at that size the honest
    // answer is usually "can't tell yet". The app leans on this.
    const fit = fitRecalibration(journal(1, 0, 40))!;
    expect(fit.indistinguishableFromCalibrated).toBe(true);
    expect(fit.a.high - fit.a.low).toBeGreaterThan(0.5);
  });

  it("detects over-extremity given enough data", () => {
    const fit = fitRecalibration(journal(0.45, 0, 800))!;
    expect(fit.a.high).toBeLessThan(1);
    expect(fit.indistinguishableFromCalibrated).toBe(false);
  });

  it("is deterministic", () => {
    const data = journal(0.7, 0.2, 120);
    expect(fitRecalibration(data)).toEqual(fitRecalibration(data));
  });

  it("survives confidences at the ends of the scale", () => {
    const fit = fitRecalibration([
      { confidence: 0, outcome: "incorrect" },
      { confidence: 100, outcome: "correct" },
      { confidence: 0, outcome: "correct" },
      { confidence: 100, outcome: "incorrect" },
      { confidence: 50, outcome: "correct" },
    ])!;
    expect(Number.isFinite(fit.a.median)).toBe(true);
    expect(Number.isFinite(fit.b.median)).toBe(true);
  });

  /**
   * Simulation-based calibration: the check that the inference itself is
   * correct, not merely plausible. Draw a true distortion, generate a journal
   * from it, refit, and ask whether the 95% interval contains the truth. Across
   * many replicates it should, about 95% of the time. An interval that is
   * quietly too narrow is the failure mode nothing else here would catch.
   */
  it("produces intervals with roughly their stated coverage", () => {
    const next = rng(20260821);
    const grid = { ...DEFAULT_GRID, steps: 61 };
    let covered = 0;
    const replicates = 40;

    for (let r = 0; r < replicates; r++) {
      const trueA = 0.4 + next() * 1.2;
      const trueB = (next() - 0.5) * 1.2;
      const fit = fitRecalibration(
        journal(trueA, trueB, 250, 1 + Math.floor(next() * 1e6)),
        grid,
        400
      )!;
      if (trueA >= fit.a.low && trueA <= fit.a.high) covered++;
    }

    const coverage = covered / replicates;
    expect(coverage).toBeGreaterThan(0.85);
    expect(coverage).toBeLessThanOrEqual(1);
  });
});

describe("recalibrate", () => {
  it("shrinks a confident claim when the person is over-extreme", () => {
    const fit = fitRecalibration(journal(0.5, 0, 800))!;
    const honest = recalibrate(fit, 90);
    expect(honest.median).toBeLessThan(85);
    expect(honest.median).toBeGreaterThan(55);
  });

  it("leaves a calibrated person roughly alone", () => {
    const fit = fitRecalibration(journal(1, 0, 800))!;
    expect(Math.abs(recalibrate(fit, 80).median - 80)).toBeLessThan(10);
  });

  it("stays monotonic — more certainty never maps to a lower honest number", () => {
    const fit = fitRecalibration(journal(0.7, -0.2, 300))!;
    const points = [10, 30, 50, 70, 90].map((x) => recalibrate(fit, x).median);
    for (let i = 1; i < points.length; i++) {
      expect(points[i]).toBeGreaterThanOrEqual(points[i - 1]);
    }
  });

  it("brackets its own median", () => {
    const fit = fitRecalibration(journal(0.8, 0.1, 200))!;
    const r = recalibrate(fit, 75);
    expect(r.low).toBeLessThanOrEqual(r.median);
    expect(r.median).toBeLessThanOrEqual(r.high);
  });
});

describe("calibrationBand", () => {
  it("covers the scale and widens where the data is thin", () => {
    const fit = fitRecalibration(journal(0.7, 0, 60))!;
    const band = calibrationBand(fit);
    expect(band[0].stated).toBe(0);
    expect(band[band.length - 1].stated).toBe(100);
    for (const p of band) {
      expect(p.low).toBeLessThanOrEqual(p.median);
      expect(p.median).toBeLessThanOrEqual(p.high);
      expect(p.low).toBeGreaterThanOrEqual(0);
      expect(p.high).toBeLessThanOrEqual(100);
    }
  });
});
