import type { BandPoint } from "@/lib/recalibration";

/**
 * What the journal already knows, delivered at the moment of deciding.
 *
 * Everything else in Doxa reports on decisions that are already made. This is
 * the one place the record can change one — the instant you put a number on
 * something is the only instant at which knowing your own history is worth
 * anything.
 *
 * Types and lookups only, with no database import. The entry form is a client
 * component, and pulling the query in here would drag Prisma — and node
 * built-ins with it — into the browser bundle. The query lives in
 * `priors-query.ts`, which only the server page touches.
 */

export type ReferenceClass = {
  category: string;
  count: number;
  stated: number;
  /** Pooled towards your overall rate, so a three-decision category can't shout. */
  pooled: number;
};

export type Priors = {
  /**
   * Whether the premortem gate fires for this entry, decided by a coin flip
   * before you start writing. Randomised rather than always-on so the app can
   * eventually tell whether the intervention does anything: a before-and-after
   * comparison would be confounded with everything else that changed about you
   * in the meantime.
   */
  premortemAssigned: boolean;
  /** Enough resolved decisions for any of this to mean anything. */
  ready: boolean;
  resolvedCount: number;
  /** Stated confidence to honest confidence, at 5-point steps. */
  curve: BandPoint[];
  overall: { stated: number; actual: number } | null;
  categories: ReferenceClass[];
};

/** Below this the curve is mostly prior, and showing it would be theatre. */
export const MIN_FOR_PRIORS = 12;

/** Nearest 5-point step, since the curve is sampled rather than continuous. */
export function honestFor(curve: BandPoint[], stated: number): BandPoint | null {
  if (!curve.length) return null;
  return curve.reduce((best, p) =>
    Math.abs(p.stated - stated) < Math.abs(best.stated - stated) ? p : best
  );
}

export function referenceClassFor(
  categories: ReferenceClass[],
  typed: string
): ReferenceClass | null {
  const key = typed.trim().toLowerCase();
  if (!key) return null;
  return categories.find((c) => c.category.toLowerCase() === key) ?? null;
}
