/**
 * Measurable properties of how a decision was written.
 *
 * The insight generator's job is to connect a calibration gap to something
 * recurring in *how* someone reasons. Left to itself a model will assert that
 * connection in prose and nothing will check it. These features are the
 * vocabulary that makes such a claim testable: they are computed in code, the
 * same way every time, so a hypothesis phrased in terms of them can be run
 * against entries the model never saw.
 *
 * The word lists are deliberately general — hedging, epistemic certainty and
 * evidence-citing are well-trodden ground in the study of how people write
 * about their own confidence. They are not reverse-engineered from any
 * particular journal, which would make every "finding" a restatement of the
 * list.
 */

const HEDGES = [
  "maybe", "probably", "might", "may ", "possibly", "perhaps", "seems", "seem ",
  "i think", "i suspect", "roughly", "fairly", "somewhat", "pretty sure",
  "reasonably", "leaning", "tend to", "could be", "not certain", "unsure",
];

const ABSOLUTES = [
  "definitely", "certainly", "obviously", "clearly", "no doubt", "without doubt",
  "always", "never", "impossible", "guaranteed", "undoubtedly", "of course",
  "no question", "bound to",
];

const CERTAINTY_CLAIMS = [
  "i'm confident", "i am confident", "i'm sure", "i am sure", "i know",
  "i'm certain", "i am certain", "confident that", "no reason to think",
];

const EVIDENCE_MARKERS = [
  "data", "checked", "compared", "researched", "looked up", "numbers",
  "benchmark", "evidence", "measured", "asked", "read ", "study", "track record",
  "last time", "history",
];

const COUNTERFACTUALS = [
  "unless", "worst case", "could go wrong", "if it doesn't", "if i'm wrong",
  "downside", "risk", "might not", "fails", "backfire", "what if",
];

/** Reads as having deliberated, which is not the same as having checked. */
const DELIBERATION_CLAIMS = [
  "thought about this a lot", "thought about it a lot", "been thinking",
  "given this a lot of thought", "thought this through", "i've weighed",
  "don't need to run this by", "don't need to ask", "know my own",
];

export const FEATURE_NAMES = [
  "hedging",
  "absolutes",
  "certaintyClaims",
  "evidenceMarkers",
  "counterfactuals",
  "deliberationClaims",
  "wordCount",
] as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];

export type Features = Record<FeatureName, number>;

function countPhrases(haystack: string, phrases: string[]): number {
  let total = 0;
  for (const phrase of phrases) {
    let from = 0;
    for (;;) {
      const at = haystack.indexOf(phrase, from);
      if (at === -1) break;
      total++;
      from = at + phrase.length;
    }
  }
  return total;
}

function words(text: string): number {
  const matched = text.trim().match(/\S+/g);
  return matched ? matched.length : 0;
}

/**
 * Rates are per hundred words, so a long entry doesn't score as more hedged
 * merely for being long. `wordCount` stays absolute — length is itself a
 * plausible signal about how much thinking got written down.
 */
export function extractFeatures(reasoning: string): Features {
  const text = ` ${reasoning.toLowerCase().replace(/\s+/g, " ")} `;
  const n = words(reasoning);
  const per100 = (count: number) => (n === 0 ? 0 : (count / n) * 100);

  return {
    hedging: per100(countPhrases(text, HEDGES)),
    absolutes: per100(countPhrases(text, ABSOLUTES)),
    certaintyClaims: per100(countPhrases(text, CERTAINTY_CLAIMS)),
    evidenceMarkers: per100(countPhrases(text, EVIDENCE_MARKERS)),
    counterfactuals: per100(countPhrases(text, COUNTERFACTUALS)),
    deliberationClaims: per100(countPhrases(text, DELIBERATION_CLAIMS)),
    wordCount: n,
  };
}

/** Human-readable, for the prompt and for the ledger. */
export const FEATURE_LABELS: Record<FeatureName, string> = {
  hedging: "hedging language, per 100 words",
  absolutes: "absolute terms like 'definitely' or 'never', per 100 words",
  certaintyClaims: "first-person certainty claims like \"I'm confident\", per 100 words",
  evidenceMarkers: "references to having checked something, per 100 words",
  counterfactuals: "mentions of how it could go wrong, per 100 words",
  deliberationClaims: "claims of having thought about it a lot, per 100 words",
  wordCount: "length of the reasoning, in words",
};
