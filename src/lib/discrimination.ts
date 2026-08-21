import { calibrationCurve, wilsonBounds, type ResolvedEntry } from "@/lib/calibration";

/**
 * Whether your probabilities carry any information, which is a different
 * question from whether they are honest.
 *
 * The dashboard could not previously tell two people apart. One is
 * miscalibrated but *informative*: they separate what happens from what
 * doesn't, they just say it at the wrong scale — fixable with a dial. The other
 * says 60% to everything and is right 60% of the time: perfectly calibrated,
 * and useless. The app congratulated the second one.
 */

/**
 * Murphy's decomposition of the Brier score:
 *
 *     BS = Reliability - Resolution + Uncertainty
 *
 * Reliability is miscalibration, and lower is better. Resolution is how far
 * your buckets move away from your own base rate — how much your confidence
 * discriminates — and higher is better. Uncertainty is the difficulty of what
 * you chose to predict, which you don't control and shouldn't be scored on.
 */
export type BrierParts = {
  brier: number;
  reliability: number;
  resolution: number;
  uncertainty: number;
};

export function decomposeBrier(entries: ResolvedEntry[]): BrierParts | null {
  const rows = entries.filter(
    (e) => e.outcome === "correct" || e.outcome === "incorrect"
  );
  if (!rows.length) return null;

  const baseRate = rows.filter((e) => e.outcome === "correct").length / rows.length;
  const buckets = calibrationCurve(rows);
  const n = rows.length;

  let reliability = 0;
  let resolution = 0;

  for (const b of buckets) {
    const stated = b.statedConfidence / 100;
    const actual = b.actualAccuracy / 100;
    const weight = b.count / n;
    reliability += weight * (stated - actual) ** 2;
    resolution += weight * (actual - baseRate) ** 2;
  }

  const uncertainty = baseRate * (1 - baseRate);

  return {
    // Computed from the same binning as the parts, so the identity holds
    // exactly rather than approximately. The raw Brier score over individual
    // predictions lives in calibration.ts and will differ slightly — the
    // decomposition is only exact against binned means.
    brier: reliability - resolution + uncertainty,
    reliability,
    resolution,
    uncertainty,
  };
}

/**
 * Area under the ROC curve, by the Mann-Whitney equivalence: the probability
 * that a decision you got right carried higher stated confidence than one you
 * got wrong. 0.5 is a coin flip — your numbers carry nothing. Ties count half,
 * which matters here because stated confidences cluster hard on round numbers.
 */
export function discrimination(entries: ResolvedEntry[]): number | null {
  const right = entries.filter((e) => e.outcome === "correct").map((e) => e.confidence);
  const wrong = entries.filter((e) => e.outcome === "incorrect").map((e) => e.confidence);
  if (!right.length || !wrong.length) return null;

  let wins = 0;
  for (const r of right) {
    for (const w of wrong) {
      if (r > w) wins += 1;
      else if (r === w) wins += 0.5;
    }
  }
  return wins / (right.length * wrong.length);
}

/**
 * An interval on the AUC that cannot collapse.
 *
 * The obvious choice — bootstrap the entries — is wrong here, and wrong in the
 * direction this product cannot afford. Under perfect separation every resample
 * scores 1, so the interval comes back as [1, 1]: four decisions that happened
 * to sort cleanly would be reported as proven skill. The nonparametric
 * bootstrap simply cannot express uncertainty about a statistic sitting on its
 * own boundary.
 *
 * So treat the AUC as a proportion instead, over the number of independent
 * comparisons actually available. That is bounded by the smaller of the two
 * outcome groups: ten right and one wrong is one wrong decision's worth of
 * evidence, whatever the product of the counts suggests. Using min() is
 * deliberately conservative — the true effective size sits somewhere above it —
 * and it keeps chance inside the interval until the journal has genuinely ruled
 * chance out.
 */
export function discriminationInterval(
  entries: ResolvedEntry[]
): { auc: number; low: number; high: number } | null {
  const auc = discrimination(entries);
  if (auc === null) return null;

  const right = entries.filter((e) => e.outcome === "correct").length;
  const wrong = entries.filter((e) => e.outcome === "incorrect").length;
  const comparisons = Math.min(right, wrong);

  const { low, high } = wilsonBounds(auc * comparisons, comparisons);
  return { auc, low, high };
}

/**
 * The two axes together. Someone can be honest and uninformative, or
 * informative and badly scaled, and those need different advice.
 */
export type Verdict = "sharp-and-honest" | "informative-but-misscaled" | "honest-but-vague" | "unclear";

export function verdict(
  parts: BrierParts | null,
  auc: { auc: number; low: number; high: number } | null
): Verdict {
  if (!parts || !auc) return "unclear";

  // Only claim discrimination when the interval clears chance.
  const discriminates = auc.low > 0.5;
  const wellScaled = parts.reliability < 0.02;

  if (discriminates && wellScaled) return "sharp-and-honest";
  if (discriminates) return "informative-but-misscaled";
  if (wellScaled) return "honest-but-vague";
  return "unclear";
}
