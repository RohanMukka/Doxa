import { prisma } from "@/lib/prisma";
import { accuracyFor, averageConfidence } from "@/lib/calibration";
import { poolCategories } from "@/lib/pooling";
import { calibrationBand, fitRecalibration } from "@/lib/recalibration";
import { MIN_FOR_PRIORS, type Priors } from "@/lib/priors";

/**
 * Server-only half of the priors: the database query.
 *
 * Kept apart from the types and lookups so the entry form, which is a client
 * component, can import those without Prisma following it into the browser.
 */
export async function priorsForEntry(): Promise<Priors> {
  const resolved = await prisma.entry.findMany({ where: { status: "resolved" } });

  if (resolved.length < MIN_FOR_PRIORS) {
    return {
      ready: false,
      resolvedCount: resolved.length,
      curve: [],
      overall: null,
      categories: [],
    };
  }

  const fit = fitRecalibration(resolved);
  const pooled = poolCategories(resolved);
  const stated = averageConfidence(resolved);
  const actual = accuracyFor(resolved);

  return {
    ready: Boolean(fit),
    resolvedCount: resolved.length,
    curve: fit
      ? calibrationBand(fit, Array.from({ length: 21 }, (_, i) => i * 5))
      : [],
    overall: stated !== null && actual !== null ? { stated, actual } : null,
    categories: (pooled?.categories ?? []).map((c) => ({
      category: c.category,
      count: c.count,
      stated: c.stated,
      pooled: c.pooled,
    })),
  };
}

