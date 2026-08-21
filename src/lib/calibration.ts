export type ResolvedEntry = {
  confidence: number;
  outcome: string | null;
  consultedOthers: boolean;
  category: string | null;
};

export type CalibrationBucket = {
  label: string;
  midpoint: number;
  count: number;
  statedConfidence: number;
  actualAccuracy: number;
  /** 95% Wilson interval on actualAccuracy, in percentage points. */
  low: number;
  high: number;
  /** Too few resolved decisions here for the point to mean anything on its own. */
  thin: boolean;
};

const BUCKETS = [
  { min: 0, max: 39, label: "0-39%", midpoint: 20 },
  { min: 40, max: 54, label: "40-54%", midpoint: 47 },
  { min: 55, max: 69, label: "55-69%", midpoint: 62 },
  { min: 70, max: 84, label: "70-84%", midpoint: 77 },
  { min: 85, max: 100, label: "85-100%", midpoint: 92 },
];

/** Below this, a bucket's accuracy is noise and is drawn as such. */
export const THIN_BUCKET = 8;

const isCorrect = (e: ResolvedEntry) => e.outcome === "correct";

/**
 * Wilson score interval for a binomial proportion — the honest error bar on
 * "you were right k out of n times". Preferred over the normal approximation
 * because it stays inside [0,1] and behaves at the small n a personal journal
 * actually produces. Returned in percentage points.
 */
export function wilsonInterval(successes: number, total: number, z = 1.96) {
  if (total === 0) return { low: 0, high: 100 };

  const p = successes / total;
  const denominator = 1 + (z * z) / total;
  const center = (p + (z * z) / (2 * total)) / denominator;
  const margin =
    (z / denominator) *
    Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total));

  return {
    low: Math.round(Math.max(0, center - margin) * 100),
    high: Math.round(Math.min(1, center + margin) * 100),
  };
}

export function calibrationCurve(entries: ResolvedEntry[]): CalibrationBucket[] {
  return BUCKETS.map((b) => {
    const inBucket = entries.filter((e) => e.confidence >= b.min && e.confidence <= b.max);
    const correct = inBucket.filter(isCorrect).length;
    const { low, high } = wilsonInterval(correct, inBucket.length);

    return {
      label: b.label,
      midpoint: b.midpoint,
      count: inBucket.length,
      statedConfidence: inBucket.length
        ? Math.round(inBucket.reduce((a, e) => a + e.confidence, 0) / inBucket.length)
        : b.midpoint,
      actualAccuracy: inBucket.length
        ? Math.round((correct / inBucket.length) * 100)
        : 0,
      low,
      high,
      thin: inBucket.length < THIN_BUCKET,
    };
  }).filter((b) => b.count > 0);
}

export function accuracyFor(entries: ResolvedEntry[]) {
  if (!entries.length) return null;
  return Math.round((entries.filter(isCorrect).length / entries.length) * 100);
}

export function averageConfidence(entries: ResolvedEntry[]) {
  if (!entries.length) return null;
  return Math.round(entries.reduce((a, e) => a + e.confidence, 0) / entries.length);
}

/**
 * Mean stated confidence minus hit rate. Positive means overconfident.
 *
 * Intuitive, and the number the dashboard leads with — but it is a *signed*
 * average, so being overconfident at one end and underconfident at the other
 * cancels out. `expectedCalibrationError` is the metric that doesn't lie in
 * that case; this one is here because it's the one a person can feel.
 */
export function calibrationGap(entries: ResolvedEntry[]) {
  const stated = averageConfidence(entries);
  const actual = accuracyFor(entries);
  if (stated === null || actual === null) return null;
  return stated - actual;
}

/**
 * Brier score — mean squared error between the probability you assigned and
 * what happened. A proper scoring rule: it is minimised only by reporting your
 * true belief, so it can't be gamed by hedging everything at 50%.
 *
 * 0 is perfect. 0.25 is what you'd score by saying 50% to everything.
 * Crucially it treats a confident miss as far worse than a hedged one, which
 * the raw hit rate does not.
 */
export function brierScore(entries: ResolvedEntry[]) {
  if (!entries.length) return null;
  const total = entries.reduce((sum, e) => {
    const p = e.confidence / 100;
    const outcome = isCorrect(e) ? 1 : 0;
    return sum + (p - outcome) ** 2;
  }, 0);
  return Number((total / entries.length).toFixed(3));
}

/**
 * Expected calibration error — the bucket-weighted average of the *absolute*
 * distance between stated confidence and hit rate.
 *
 * Unlike `calibrationGap` this never cancels: someone wildly overconfident at
 * the top of the scale and equally underconfident at the bottom scores 0 on
 * the gap and correctly scores badly here. In percentage points.
 */
export function expectedCalibrationError(entries: ResolvedEntry[]) {
  if (!entries.length) return null;
  const buckets = calibrationCurve(entries);
  const weighted = buckets.reduce(
    (sum, b) => sum + b.count * Math.abs(b.statedConfidence - b.actualAccuracy),
    0
  );
  return Math.round(weighted / entries.length);
}

export type CategoryStats = {
  category: string;
  count: number;
  stated: number;
  actual: number;
  ece: number;
  brier: number;
  /** Too few to draw a conclusion from on its own. */
  thin: boolean;
};

/** Below this a category's numbers are shown but explicitly not leaned on. */
export const THIN_CATEGORY = 5;

/**
 * Per-category calibration. Global numbers say *whether* you're miscalibrated;
 * these say *where*, which is the part you can act on — "I'm bad at career
 * predictions" is a different instruction from "I'm bad at predicting".
 */
export function byCategory(entries: ResolvedEntry[]): CategoryStats[] {
  const groups = new Map<string, ResolvedEntry[]>();
  for (const e of entries) {
    const key = e.category?.trim() || "uncategorised";
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  return [...groups.entries()]
    .map(([category, rows]) => ({
      category,
      count: rows.length,
      stated: averageConfidence(rows) as number,
      actual: accuracyFor(rows) as number,
      ece: expectedCalibrationError(rows) as number,
      brier: brierScore(rows) as number,
      thin: rows.length < THIN_CATEGORY,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * The category worth acting on: largest absolute calibration error among those
 * with enough entries to mean anything. Null when nothing clears the bar.
 */
export function mostMiscalibratedCategory(entries: ResolvedEntry[]) {
  const usable = byCategory(entries).filter((c) => !c.thin);
  if (usable.length < 2) return null;
  return usable.reduce((worst, c) => (c.ece > worst.ece ? c : worst));
}

export function splitByConsultation(entries: ResolvedEntry[]) {
  return {
    solo: entries.filter((e) => !e.consultedOthers),
    consulted: entries.filter((e) => e.consultedOthers),
  };
}

/**
 * Whether the overall gap is large enough, given how much has been logged, to
 * be worth claiming out loud. Compares the gap against the 95% Wilson
 * half-width on the hit rate — with 40-odd entries a single-digit gap simply
 * isn't distinguishable from noise, and the dashboard shouldn't assert it.
 */
export function gapIsMeaningful(entries: ResolvedEntry[]) {
  const gap = calibrationGap(entries);
  if (gap === null || entries.length === 0) return false;
  const correct = entries.filter(isCorrect).length;
  const { low, high } = wilsonInterval(correct, entries.length);
  const halfWidth = (high - low) / 2;
  return Math.abs(gap) > halfWidth;
}
