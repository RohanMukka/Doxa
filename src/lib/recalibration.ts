/**
 * A model of how your stated confidence is distorted, fitted properly.
 *
 * The bucket chart estimates five independent proportions from a dataset that
 * can never support five independent proportions — which is why every error bar
 * on it swallows every finding. But the thing you actually want to know isn't
 * five numbers. It's a distortion:
 *
 *     P(correct | p) = sigma( a * logit(p) + b )
 *
 * Two parameters instead of five, so the same forty decisions say far more.
 * `a = 1, b = 0` is perfect calibration. `a < 1` is over-extremity — you push
 * your probabilities towards the ends, which is the classic overconfidence
 * signature and the one a bucket table cannot state. `b` is a directional bias.
 *
 * Fitted over a grid rather than by MCMC. Two parameters make a grid exact
 * enough, and it is deterministic, dependency-free and testable — a sampler
 * here would be harder to trust for no gain.
 */

export type Observation = { confidence: number; outcome: string | null };

/**
 * Stated confidences arrive as whole percents, and logit(0) is infinite. Half a
 * percent in from each end is far outside anything a person means by a
 * difference in certainty, and it keeps 0 and 100 as usable answers rather than
 * discarding those rows.
 */
export const CLAMP = 0.005;

export function clampProbability(p: number) {
  return Math.min(1 - CLAMP, Math.max(CLAMP, p));
}

export const logit = (p: number) => Math.log(p / (1 - p));
export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/** log(1 + e^x), computed so neither tail overflows. */
function softplus(x: number) {
  return x > 0 ? x + Math.log1p(Math.exp(-x)) : Math.log1p(Math.exp(x));
}

const logSigmoid = (z: number) => -softplus(-z);
const logOneMinusSigmoid = (z: number) => -softplus(z);

export type GridSpec = {
  aMin: number;
  aMax: number;
  bMin: number;
  bMax: number;
  steps: number;
};

export const DEFAULT_GRID: GridSpec = {
  // a below 1 is over-extremity, above 1 is under-extremity. 3 is far past
  // anything a real journal produces, which is what a bound is for.
  aMin: 0,
  aMax: 3,
  bMin: -2,
  bMax: 2,
  steps: 121,
};

/**
 * Weakly informative, and deliberately centred on *perfect calibration* rather
 * than on the population tendency to be overconfident.
 *
 * Centring it where the literature sits would make the app likelier to announce
 * a finding it was always going to announce. In a tool about not overclaiming,
 * the prior should not assume the conclusion — so it starts from "you are
 * calibrated" and makes the data do the work of moving it.
 */
function logPrior(a: number, b: number) {
  const aTerm = -((a - 1) ** 2) / (2 * 0.5 ** 2);
  const bTerm = -(b ** 2) / (2 * 1 ** 2);
  return aTerm + bTerm;
}

export type Fit = {
  n: number;
  /** Posterior draws, resampled from the grid. Deterministic. */
  draws: { a: number; b: number }[];
  a: Interval;
  b: Interval;
  /**
   * True when a = 1, b = 0 — perfect calibration — sits inside both credible
   * intervals, i.e. the data does not yet distinguish you from well calibrated.
   */
  indistinguishableFromCalibrated: boolean;
};

export type Interval = { median: number; low: number; high: number };

function weightedQuantiles(
  values: number[],
  weights: number[],
  qs: number[]
): number[] {
  const order = values.map((v, i) => i).sort((i, j) => values[i] - values[j]);
  const total = weights.reduce((s, w) => s + w, 0);
  const out: number[] = [];
  let cumulative = 0;
  let cursor = 0;

  for (const q of qs) {
    const target = q * total;
    while (cursor < order.length && cumulative + weights[order[cursor]] < target) {
      cumulative += weights[order[cursor]];
      cursor++;
    }
    out.push(values[order[Math.min(cursor, order.length - 1)]]);
  }
  return out;
}

/** Systematic resampling — deterministic, and spreads draws evenly through the mass. */
function resample(
  cells: { a: number; b: number }[],
  weights: number[],
  count: number
): { a: number; b: number }[] {
  const total = weights.reduce((s, w) => s + w, 0);
  const step = total / count;
  const draws: { a: number; b: number }[] = [];
  let cumulative = 0;
  let cursor = 0;

  for (let i = 0; i < count; i++) {
    const target = (i + 0.5) * step;
    while (cursor < cells.length - 1 && cumulative + weights[cursor] < target) {
      cumulative += weights[cursor];
      cursor++;
    }
    draws.push(cells[cursor]);
  }
  return draws;
}

export function fitRecalibration(
  observations: Observation[],
  grid: GridSpec = DEFAULT_GRID,
  drawCount = 1500
): Fit | null {
  const rows = observations
    .filter((o) => o.outcome === "correct" || o.outcome === "incorrect")
    .map((o) => ({
      z: logit(clampProbability(o.confidence / 100)),
      y: o.outcome === "correct" ? 1 : 0,
    }));

  if (rows.length === 0) return null;

  const cells: { a: number; b: number }[] = [];
  const logPosterior: number[] = [];

  const aStep = (grid.aMax - grid.aMin) / (grid.steps - 1);
  const bStep = (grid.bMax - grid.bMin) / (grid.steps - 1);

  for (let i = 0; i < grid.steps; i++) {
    const a = grid.aMin + i * aStep;
    for (let j = 0; j < grid.steps; j++) {
      const b = grid.bMin + j * bStep;

      let logLik = 0;
      for (const { z, y } of rows) {
        const eta = a * z + b;
        logLik += y === 1 ? logSigmoid(eta) : logOneMinusSigmoid(eta);
      }

      cells.push({ a, b });
      logPosterior.push(logLik + logPrior(a, b));
    }
  }

  // Shift before exponentiating; the raw log-posterior underflows at this n.
  const peak = Math.max(...logPosterior);
  const weights = logPosterior.map((lp) => Math.exp(lp - peak));

  const [aLow, aMedian, aHigh] = weightedQuantiles(
    cells.map((c) => c.a),
    weights,
    [0.025, 0.5, 0.975]
  );
  const [bLow, bMedian, bHigh] = weightedQuantiles(
    cells.map((c) => c.b),
    weights,
    [0.025, 0.5, 0.975]
  );

  return {
    n: rows.length,
    draws: resample(cells, weights, drawCount),
    a: { median: aMedian, low: aLow, high: aHigh },
    b: { median: bMedian, low: bLow, high: bHigh },
    indistinguishableFromCalibrated:
      aLow <= 1 && 1 <= aHigh && bLow <= 0 && 0 <= bHigh,
  };
}

/**
 * What the honest number is when you feel a given level of certainty.
 *
 * This is the output a bucket table cannot produce, and the only one that
 * changes what you do next: not "you are ten points overconfident on average"
 * but "when you feel 90%, say 74%".
 */
export function recalibrate(fit: Fit, statedPercent: number): Interval {
  const z = logit(clampProbability(statedPercent / 100));
  const values = fit.draws.map((d) => sigmoid(d.a * z + d.b) * 100);
  values.sort((x, y) => x - y);

  const at = (q: number) => values[Math.min(values.length - 1, Math.floor(q * values.length))];
  return { median: at(0.5), low: at(0.025), high: at(0.975) };
}

export type BandPoint = { stated: number } & Interval;

/**
 * The posterior over the whole curve, as a band. Replaces five points carrying
 * error bars wide enough to be useless: the model borrows strength across the
 * entire confidence range instead of estimating each bucket in isolation.
 */
export function calibrationBand(fit: Fit, xs?: number[]): BandPoint[] {
  const points = xs ?? Array.from({ length: 41 }, (_, i) => i * 2.5);
  return points.map((stated) => ({ stated, ...recalibrate(fit, stated) }));
}
