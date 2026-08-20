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
};

const BUCKETS = [
  { min: 0, max: 39, label: "0-39%", midpoint: 20 },
  { min: 40, max: 54, label: "40-54%", midpoint: 47 },
  { min: 55, max: 69, label: "55-69%", midpoint: 62 },
  { min: 70, max: 84, label: "70-84%", midpoint: 77 },
  { min: 85, max: 100, label: "85-100%", midpoint: 92 },
];

export function calibrationCurve(entries: ResolvedEntry[]): CalibrationBucket[] {
  return BUCKETS.map((b) => {
    const inBucket = entries.filter((e) => e.confidence >= b.min && e.confidence <= b.max);
    const correct = inBucket.filter((e) => e.outcome === "correct").length;
    return {
      label: b.label,
      midpoint: b.midpoint,
      count: inBucket.length,
      statedConfidence: inBucket.length
        ? Math.round(inBucket.reduce((a, e) => a + e.confidence, 0) / inBucket.length)
        : b.midpoint,
      actualAccuracy: inBucket.length ? Math.round((correct / inBucket.length) * 100) : 0,
    };
  }).filter((b) => b.count > 0);
}

export function accuracyFor(entries: ResolvedEntry[]) {
  if (!entries.length) return null;
  const correct = entries.filter((e) => e.outcome === "correct").length;
  return Math.round((correct / entries.length) * 100);
}

export function averageConfidence(entries: ResolvedEntry[]) {
  if (!entries.length) return null;
  return Math.round(entries.reduce((a, e) => a + e.confidence, 0) / entries.length);
}

// Overall gap between how confident you said you were and how often you were
// actually right. Positive means overconfident.
export function calibrationGap(entries: ResolvedEntry[]) {
  const stated = averageConfidence(entries);
  const actual = accuracyFor(entries);
  if (stated === null || actual === null) return null;
  return stated - actual;
}

export function splitByConsultation(entries: ResolvedEntry[]) {
  return {
    solo: entries.filter((e) => !e.consultedOthers),
    consulted: entries.filter((e) => e.consultedOthers),
  };
}
