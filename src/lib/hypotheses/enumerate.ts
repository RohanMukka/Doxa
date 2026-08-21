import { extractFeatures, FEATURE_NAMES, type FeatureName } from "./features";
import { describe, matches, type Predicate, type Subject } from "./predicate";

/**
 * Candidate hypotheses generated mechanically from the journal's own shape.
 *
 * Two reasons this exists rather than leaving proposal entirely to the model.
 *
 * It needs no key, no network and no model, so the ledger is populated on a
 * fresh clone — a feature whose whole point is showing which claims survive
 * scrutiny is worthless if it starts empty.
 *
 * And it is the baseline the model has to beat. A sweep like this will turn up
 * a "significant" subgroup by luck every time, which is exactly why the batch
 * goes through false-discovery control together. The model's job is to propose
 * something a mechanical sweep wouldn't think of; it is judged at the same bar,
 * against the same held-out decisions.
 */

export type Candidate = {
  predicate: Predicate;
  /** Where it came from, so the ledger can say so. */
  source: "swept" | "model";
  headline: string;
  /** Only a model-proposed candidate carries prose. */
  evidence?: string;
  tryInstead?: string;
};

/**
 * One claim per feature, written out rather than assembled from the feature's
 * own label — a headline stitched together from a noun phrase reads like
 * machine output, and this is the sentence a person has to agree or disagree
 * with.
 */
const FEATURE_HYPOTHESES: Record<FeatureName, string> = {
  hedging: "The more you hedge in writing, the better your confidence holds up.",
  absolutes: "Reaching for words like \u2018definitely\u2019 and \u2018never\u2019 marks the decisions you get wrong.",
  certaintyClaims: "Saying outright that you\u2019re confident is a worse sign than feeling it quietly.",
  evidenceMarkers: "Decisions where you mention having checked something hold up better.",
  counterfactuals: "Naming how it could go wrong is what keeps your confidence honest.",
  deliberationClaims: "Saying you\u2019ve thought about it a lot stands in for having checked, and predicts being wrong.",
  wordCount: "The decisions you wrote most about are the ones you were most wrong about.",
};

/** A candidate that can't catch a reasonable share of the journal can't be tested. */
const MIN_SHARE = 0.15;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function viable(predicate: Predicate, training: Subject[]): boolean {
  const inside = training.filter((s) => matches(predicate, s)).length;
  const share = inside / training.length;
  return share >= MIN_SHARE && share <= 1 - MIN_SHARE;
}

export function enumerateCandidates(training: Subject[]): Candidate[] {
  if (training.length < 8) return [];

  const out: Candidate[] = [];
  const add = (predicate: Predicate, headline: string) => {
    if (viable(predicate, training)) out.push({ predicate, source: "swept", headline });
  };

  // Only one side of a binary split: testing both would be the same lift with
  // its sign flipped, and would pay multiplicity twice for one question.
  add(
    { field: "consultedOthers", eq: false },
    "Decisions you reasoned through alone are calibrated differently from the ones you talked over."
  );

  for (const threshold of [85, 70]) {
    add(
      { field: "confidence", op: "gte", value: threshold },
      `Your confidence goes further wrong once you're above ${threshold}%.`
    );
  }
  add(
    { field: "confidence", op: "lte", value: 55 },
    "Your low-confidence calls behave differently from the rest."
  );

  const categories = [...new Set(training.map((s) => s.category?.trim()).filter(Boolean))];
  for (const category of categories as string[]) {
    add(
      { field: "category", eq: category },
      `Your ${category} predictions are calibrated differently from everything else.`
    );
  }

  const features = training.map((s) => extractFeatures(s.reasoning));
  for (const name of FEATURE_NAMES) {
    const values = features.map((f) => f[name as FeatureName]);
    const cut = median(values);
    if (cut <= 0) continue;
    add({ field: "feature", name, op: "gte", value: cut }, FEATURE_HYPOTHESES[name]);
  }

  // A couple of compounds, because the interesting claims are usually joint.
  add(
    {
      all: [
        { field: "confidence", op: "gte", value: 85 },
        { field: "consultedOthers", eq: false },
      ],
    },
    "Being very sure and not checking with anyone is a worse combination than either alone."
  );
  add(
    {
      all: [
        { field: "confidence", op: "gte", value: 70 },
        { field: "feature", name: "evidenceMarkers", op: "lte", value: 0 },
      ],
    },
    "Confidence without any sign you checked something holds up worse."
  );

  return out;
}

/** For the ledger, when a swept candidate needs restating. */
export const explainCandidate = (c: Candidate) => describe(c.predicate);
