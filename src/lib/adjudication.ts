import { accuracyFor, averageConfidence, calibrationGap } from "@/lib/calibration";

/**
 * Your self-graded accuracy, against the accuracy something else graded.
 *
 * This is the number the whole project has been missing. Every statistic in
 * Doxa rests on outcomes you recorded about yourself, and that is precisely
 * where motivated reasoning lives: the person marking the paper is the person
 * who sat the exam. Preregistering the criterion narrowed the gap. Handing the
 * criterion to something that can check it is what finally lets the two be
 * compared.
 *
 * The comparison is not clean and never will be. The decisions a machine can
 * settle are systematically different from the ones it can't — plainer,
 * shorter-horizon, less tangled up in what you wanted to be true. So a gap here
 * is not proof of self-flattery. It is the first evidence about it that does
 * not come from the person under suspicion.
 */

export type AdjudicationSide = {
  n: number;
  stated: number | null;
  actual: number | null;
  gap: number | null;
};

export type AdjudicationSplit = {
  self: AdjudicationSide;
  external: AdjudicationSide;
  /** Awaiting a criterion that hasn't come due, or hasn't settled. */
  pendingChecks: number;
  /** Self-graded gap minus externally graded gap. Positive means you flatter yourself. */
  difference: number | null;
  comparable: boolean;
};

type Row = {
  confidence: number;
  outcome: string | null;
  adjudication: string | null;
};

/** Below this a side is an anecdote rather than a comparison. */
const MIN_SIDE = 5;

function sideOf(rows: Row[]): AdjudicationSide {
  return {
    n: rows.length,
    stated: averageConfidence(rows as never),
    actual: accuracyFor(rows as never),
    gap: calibrationGap(rows as never),
  };
}

export function adjudicationSplit(
  resolved: Row[],
  pendingChecks: number
): AdjudicationSplit {
  const graded = resolved.filter(
    (e) => e.outcome === "correct" || e.outcome === "incorrect"
  );
  const self = sideOf(graded.filter((e) => e.adjudication !== "external"));
  const external = sideOf(graded.filter((e) => e.adjudication === "external"));

  return {
    self,
    external,
    pendingChecks,
    difference:
      self.gap !== null && external.gap !== null ? self.gap - external.gap : null,
    comparable: self.n >= MIN_SIDE && external.n >= MIN_SIDE,
  };
}
