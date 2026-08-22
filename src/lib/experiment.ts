import { accuracyFor, averageConfidence, calibrationGap } from "@/lib/calibration";
import { PREMORTEM_THRESHOLD } from "@/lib/validation";

/**
 * Does the premortem actually help?
 *
 * A tool that intervenes in your decisions and never checks whether the
 * intervention works is asking you to take on faith exactly the kind of claim
 * it was built to stop you taking on faith. So the gate fires on a random half
 * of qualifying decisions and the two arms are compared.
 *
 * Randomised rather than before-and-after on purpose. Turning the gate on for
 * everyone and comparing against last year would be confounded with every other
 * thing that changed about the person — including the fact that they have been
 * staring at a calibration dashboard the whole time.
 */

export type Arm = {
  n: number;
  stated: number | null;
  actual: number | null;
  gap: number | null;
};

export type ExperimentResult = {
  threshold: number;
  asked: Arm;
  notAsked: Arm;
  /** Gap when asked, minus gap when not. Negative means the premortem helped. */
  difference: number | null;
  p: number | null;
  /** True once both arms have enough resolved decisions to compare at all. */
  comparable: boolean;
};

type Row = {
  confidence: number;
  outcome: string | null;
  premortemAssigned: boolean | null;
};

/** Below this an arm is a rumour rather than a group. */
const MIN_ARM = 5;

function armOf(rows: Row[]): Arm {
  return {
    n: rows.length,
    stated: averageConfidence(rows as never),
    actual: accuracyFor(rows as never),
    gap: calibrationGap(rows as never),
  };
}

export function premortemExperiment(entries: Row[]): ExperimentResult {
  // Only decisions the gate could have fired on, and only those where an
  // assignment was recorded — entries written before the experiment existed
  // belong to neither arm and would bias whichever one they were dropped into.
  const eligible = entries.filter(
    (e) =>
      e.confidence >= PREMORTEM_THRESHOLD &&
      e.premortemAssigned !== null &&
      (e.outcome === "correct" || e.outcome === "incorrect")
  );

  const asked = eligible.filter((e) => e.premortemAssigned === true);
  const notAsked = eligible.filter((e) => e.premortemAssigned === false);

  const comparable = asked.length >= MIN_ARM && notAsked.length >= MIN_ARM;
  const a = armOf(asked);
  const b = armOf(notAsked);
  const difference = a.gap !== null && b.gap !== null ? a.gap - b.gap : null;

  return {
    threshold: PREMORTEM_THRESHOLD,
    asked: a,
    notAsked: b,
    difference,
    p: comparable && difference !== null ? permutationP(asked, notAsked, difference) : null,
    comparable,
  };
}

/**
 * Shuffles which decisions were asked, and counts how often chance produces a
 * difference this big. Seeded, so the verdict doesn't wobble between renders.
 */
function permutationP(
  asked: Row[],
  notAsked: Row[],
  observed: number,
  iterations = 5000,
  seed = 0xbead
): number {
  const pool = [...asked, ...notAsked];
  const askedCount = asked.length;

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
    const x = calibrationGap(shuffled.slice(0, askedCount) as never);
    const y = calibrationGap(shuffled.slice(askedCount) as never);
    if (x !== null && y !== null && Math.abs(x - y) >= Math.abs(observed)) {
      atLeastAsExtreme++;
    }
  }

  return (atLeastAsExtreme + 1) / (iterations + 1);
}
