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
/**
 * A coin flip, overridable for tests and screenshots. There is deliberately no
 * user-facing setting: an intervention you can turn off when you don't fancy it
 * is one that never fires when it would have mattered.
 */
function assignPremortem(): boolean {
  const forced = process.env.DOXA_PREMORTEM;
  if (forced === "always") return true;
  if (forced === "never") return false;
  return Math.random() < 0.5;
}

export async function priorsForEntry(): Promise<Priors> {
  const resolved = await prisma.entry.findMany({ where: { status: "resolved" } });
  const premortemAssigned = assignPremortem();

  if (resolved.length < MIN_FOR_PRIORS) {
    return {
      premortemAssigned,
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
    premortemAssigned,
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

