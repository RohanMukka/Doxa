import { calibrationGap } from "@/lib/calibration";
import { split, type Predicate, type Subject } from "./predicate";

/**
 * Testing a hypothesis on decisions the model never saw.
 *
 * A model handed a whole journal will always find a subgroup that looks
 * miscalibrated — with enough ways to slice forty decisions, something will
 * separate. That is not a finding, it is arithmetic. So the model proposes from
 * a training window only, and every predicate it emits is scored on the
 * decisions held back.
 *
 * Two guards make the result mean something:
 *
 *   - A permutation test on the held-out lift, because at holdout-sized n a
 *     difference of means invites you to read a great deal into very little.
 *   - Benjamini-Hochberg across the whole batch, because testing twenty
 *     hypotheses at p < 0.05 turns up one by luck. The app refuses to overclaim
 *     about the user; it has to refuse to overclaim about its own findings too.
 */

export type Outcome = "held" | "failed" | "untestable";

export type HypothesisResult = {
  /** Calibration gap inside the predicate, minus the gap outside it. */
  lift: number;
  nInside: number;
  nOutside: number;
  p: number;
  /** Benjamini-Hochberg adjusted p. Filled in once the batch is known. */
  q: number;
  outcome: Outcome;
  reason?: string;
};

/** Below this a subgroup can't support a claim, whatever the arithmetic says. */
export const MIN_GROUP = 4;

export function liftOf(predicate: Predicate, holdout: Subject[]) {
  const { inside, outside } = split(predicate, holdout);
  const gapInside = calibrationGap(inside);
  const gapOutside = calibrationGap(outside);
  if (gapInside === null || gapOutside === null) return null;
  return { lift: gapInside - gapOutside, inside, outside };
}

/**
 * Shuffles which entries fall inside the predicate and asks how often chance
 * alone produces a lift this large. Seeded, so a hypothesis doesn't change
 * status between page loads.
 */
export function testHypothesis(
  predicate: Predicate,
  holdout: Subject[],
  iterations = 5000,
  seed = 0xf00d
): HypothesisResult {
  const measured = liftOf(predicate, holdout);

  if (!measured) {
    return {
      lift: 0, nInside: 0, nOutside: 0, p: 1, q: 1,
      outcome: "untestable",
      reason: "The held-out decisions don't fall on both sides of this.",
    };
  }

  const { lift, inside, outside } = measured;

  if (inside.length < MIN_GROUP || outside.length < MIN_GROUP) {
    return {
      lift,
      nInside: inside.length,
      nOutside: outside.length,
      p: 1,
      q: 1,
      outcome: "untestable",
      reason: `Only ${Math.min(inside.length, outside.length)} held-out decisions on the smaller side — too few to test.`,
    };
  }

  const pool = [...inside, ...outside];
  const insideCount = inside.length;

  let state = seed >>> 0 || 1;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };

  const shuffled = [...pool];
  let atLeastAsExtreme = 0;

  for (let i = 0; i < iterations; i++) {
    for (let j = shuffled.length - 1; j > 0; j--) {
      const k = Math.floor(next() * (j + 1));
      [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
    }
    const a = calibrationGap(shuffled.slice(0, insideCount));
    const b = calibrationGap(shuffled.slice(insideCount));
    if (a !== null && b !== null && Math.abs(a - b) >= Math.abs(lift)) {
      atLeastAsExtreme++;
    }
  }

  const p = (atLeastAsExtreme + 1) / (iterations + 1);

  return {
    lift,
    nInside: inside.length,
    nOutside: outside.length,
    p,
    q: p,
    outcome: p < 0.05 ? "held" : "failed",
  };
}

/**
 * Benjamini-Hochberg, controlling the false discovery rate across a batch.
 *
 * Without this the ledger is a slot machine: propose enough hypotheses and one
 * clears 0.05 by luck, and it is exactly the one that gets shown as a finding.
 * Untestable rows are excluded from the correction — they were never tested, so
 * they cost no multiplicity.
 */
export function controlFalseDiscovery(
  results: HypothesisResult[],
  q = 0.1
): HypothesisResult[] {
  const testable = results
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.outcome !== "untestable")
    .sort((a, b) => a.r.p - b.r.p);

  const m = testable.length;
  if (m === 0) return results.map((r) => ({ ...r }));

  const out = results.map((r) => ({ ...r }));

  // Adjusted p-values, enforced monotonic from the largest downwards.
  let running = 1;
  for (let rank = m - 1; rank >= 0; rank--) {
    const { r, i } = testable[rank];
    running = Math.min(running, (r.p * m) / (rank + 1));
    out[i].q = running;
    out[i].outcome = running <= q ? "held" : "failed";
  }

  return out;
}

/**
 * Splits the journal in time. The model proposes from the earlier decisions
 * only; the later ones are what its claims are judged on.
 *
 * Time-ordered rather than random, because the claim being made is predictive —
 * "this is how you reason" should hold for the next decision, not merely fit
 * the ones already in hand.
 */
export function trainingSplit<T>(entries: T[], holdoutFraction = 0.3) {
  const holdoutSize = Math.max(MIN_GROUP * 2, Math.round(entries.length * holdoutFraction));
  const cut = Math.max(0, entries.length - holdoutSize);
  return { training: entries.slice(0, cut), holdout: entries.slice(cut) };
}
