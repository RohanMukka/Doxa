import { describe, expect, it } from "vitest";
import { premortemExperiment } from "./experiment";

const row = (confidence: number, outcome: string, premortemAssigned: boolean | null) => ({
  confidence,
  outcome,
  premortemAssigned,
});

const arm = (n: number, confidence: number, correct: number, assigned: boolean) =>
  Array.from({ length: n }, (_, i) =>
    row(confidence, i < correct ? "correct" : "incorrect", assigned)
  );

describe("premortemExperiment", () => {
  it("reports nothing comparable before either arm has filled up", () => {
    const r = premortemExperiment(arm(3, 90, 2, true));
    expect(r.comparable).toBe(false);
    expect(r.p).toBeNull();
  });

  it("ignores decisions below the threshold, which the gate never saw", () => {
    const r = premortemExperiment([
      ...arm(8, 60, 5, true),
      ...arm(8, 60, 5, false),
    ]);
    expect(r.asked.n).toBe(0);
    expect(r.notAsked.n).toBe(0);
  });

  it("ignores entries written before the experiment existed", () => {
    // They belong to neither arm; dropping them into one would bias it.
    const r = premortemExperiment([
      ...arm(6, 90, 3, true),
      ...arm(6, 90, 3, false),
      ...Array.from({ length: 20 }, () => row(90, "incorrect", null)),
    ]);
    expect(r.asked.n).toBe(6);
    expect(r.notAsked.n).toBe(6);
  });

  it("finds a real effect when the asked arm is better calibrated", () => {
    // Asked: says 90, right 80% of the time. Not asked: says 90, right 30%.
    const r = premortemExperiment([...arm(20, 90, 16, true), ...arm(20, 90, 6, false)]);
    expect(r.difference).toBeLessThan(-40);
    expect(r.p).toBeLessThan(0.01);
  });

  it("reports no effect when the arms behave the same", () => {
    const r = premortemExperiment([...arm(15, 90, 9, true), ...arm(15, 90, 9, false)]);
    expect(r.difference).toBe(0);
    expect(r.p).toBeGreaterThan(0.5);
  });

  it("is deterministic", () => {
    const data = [...arm(10, 92, 6, true), ...arm(10, 92, 4, false)];
    expect(premortemExperiment(data)).toEqual(premortemExperiment(data));
  });

  it("never reports a p of zero", () => {
    const r = premortemExperiment([...arm(12, 95, 12, true), ...arm(12, 95, 0, false)]);
    expect(r.p).toBeGreaterThan(0);
  });
});

describe("entries from before the experiment", () => {
  it("are counted in neither arm", () => {
    // The seeded journal is entirely pre-experiment. Landing it in the control
    // group would stack that arm with a year of decisions the intervention was
    // never withheld from, and the comparison would be meaningless.
    const r = premortemExperiment([
      ...Array.from({ length: 19 }, () => row(90, "incorrect", null)),
      ...arm(6, 90, 4, true),
      ...arm(6, 90, 4, false),
    ]);
    expect(r.asked.n).toBe(6);
    expect(r.notAsked.n).toBe(6);
    expect(r.comparable).toBe(true);
  });

  it("leave the trial reading as not started when they are all there is", () => {
    const r = premortemExperiment(
      Array.from({ length: 19 }, () => row(90, "incorrect", null))
    );
    expect(r.asked.n).toBe(0);
    expect(r.notAsked.n).toBe(0);
    expect(r.comparable).toBe(false);
  });
});
