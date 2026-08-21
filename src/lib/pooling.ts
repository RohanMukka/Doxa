import type { ResolvedEntry } from "@/lib/calibration";

/**
 * Per-category accuracy that borrows strength from the rest of the journal.
 *
 * The old answer to a category holding three decisions was to show its numbers
 * and refuse to rank it — a frequentist surrender dressed as caution. "100%
 * right across 3 decisions" isn't a number you should print next to one drawn
 * from 25, and hiding the ranking doesn't stop a reader believing it.
 *
 * The fix is partial pooling. Each category's true accuracy is treated as drawn
 * from a distribution over the person's categories, so an estimate with little
 * evidence behind it is pulled towards the journal's overall rate, and one with
 * plenty barely moves. Nothing gets hidden, nothing thin gets to shout, and the
 * amount of shrinkage is visible rather than a threshold nobody can see.
 *
 * The pooling strength is fitted from the spread between categories by moment
 * matching rather than fixed by hand: when categories genuinely differ, less
 * shrinkage; when the spread looks like noise, more.
 */

export type PooledCategory = {
  category: string;
  count: number;
  /** The category's own hit rate, ignoring everything else. */
  raw: number;
  /** After shrinking towards the journal's overall rate. */
  pooled: number;
  /** 0 = kept its own estimate, 1 = pulled entirely to the overall rate. */
  shrinkage: number;
  stated: number;
};

export type PoolingResult = {
  overall: number;
  /** Prior strength, in decisions. Large means the categories look alike. */
  priorWeight: number;
  categories: PooledCategory[];
};

const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;

export function poolCategories(entries: ResolvedEntry[]): PoolingResult | null {
  const rows = entries.filter(
    (e) => e.outcome === "correct" || e.outcome === "incorrect"
  );
  if (!rows.length) return null;

  const groups = new Map<string, ResolvedEntry[]>();
  for (const e of rows) {
    const key = e.category?.trim() || "uncategorised";
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  const overall = rows.filter((e) => e.outcome === "correct").length / rows.length;

  const observed = [...groups.entries()].map(([category, rs]) => ({
    category,
    count: rs.length,
    raw: rs.filter((e) => e.outcome === "correct").length / rs.length,
    stated: mean(rs.map((e) => e.confidence)),
  }));

  const priorWeight = fitPriorWeight(observed, overall);

  const categories = observed
    .map((o) => {
      // Beta-binomial posterior mean: the category's own evidence and the
      // journal's overall rate, weighted by how much of each there is.
      const shrinkage = priorWeight / (priorWeight + o.count);
      return {
        ...o,
        raw: Math.round(o.raw * 100),
        stated: Math.round(o.stated),
        pooled: Math.round((o.raw * (1 - shrinkage) + overall * shrinkage) * 100),
        shrinkage,
      };
    })
    .sort((a, b) => b.count - a.count);

  return { overall: Math.round(overall * 100), priorWeight, categories };
}

/**
 * How strongly to pool, in units of decisions.
 *
 * Compares the spread actually seen between categories against the spread
 * binomial noise alone would produce at these group sizes. If the observed
 * spread is no bigger than the noise, the categories are indistinguishable and
 * everything collapses to the overall rate. The more the spread exceeds the
 * noise, the more each category is allowed to keep its own answer.
 */
function fitPriorWeight(
  observed: { count: number; raw: number }[],
  overall: number
): number {
  const CEILING = 40;
  if (observed.length < 2) return CEILING;

  const total = observed.reduce((n, o) => n + o.count, 0);

  // Variance between categories, weighted by size.
  const between =
    observed.reduce((s, o) => s + o.count * (o.raw - overall) ** 2, 0) / total;

  // What that variance would be if every category shared the overall rate and
  // only sampling noise separated them.
  const expectedNoise =
    observed.reduce((s, o) => s + (overall * (1 - overall)) / Math.max(1, o.count), 0) /
    observed.length;

  const signal = between - expectedNoise;
  if (signal <= 0) return CEILING;

  // Method of moments for a Beta prior: variance of the underlying rates maps
  // to a prior sample size of p(1-p)/var - 1.
  const weight = (overall * (1 - overall)) / signal - 1;
  return Math.min(CEILING, Math.max(1, weight));
}

/**
 * The category worth acting on: the largest gap between what you said and what
 * the pooled estimate says happened. Uses the pooled figure precisely so a
 * three-decision fluke can't win.
 */
export function worstCategory(result: PoolingResult): PooledCategory | null {
  if (result.categories.length < 2) return null;
  return result.categories.reduce((worst, c) =>
    Math.abs(c.stated - c.pooled) > Math.abs(worst.stated - worst.pooled) ? c : worst
  );
}
