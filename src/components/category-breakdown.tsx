import type { PoolingResult, PooledCategory } from "@/lib/pooling";

/**
 * Global calibration says *whether* you're off; this says *where*.
 *
 * Every row shows the rate it actually recorded and the rate after pooling
 * towards the journal's overall accuracy, with how far it moved. A category
 * holding three decisions no longer gets to read 100% and be quietly excluded
 * from the ranking — it gets pulled towards the middle, in the open, by an
 * amount the reader can see.
 */
function Shrinkage({ value }: { value: number }) {
  const pulled = Math.round(value * 100);
  if (pulled < 15) return null;
  return (
    <span className="ml-2 text-[11px] font-normal text-ink-muted">
      pulled {pulled}% toward your average
    </span>
  );
}

export function CategoryBreakdown({
  result,
  worst,
}: {
  result: PoolingResult;
  worst: PooledCategory | null;
}) {
  if (result.categories.length === 0) return null;

  const gapOf = (c: PooledCategory) => Math.abs(c.stated - c.pooled);
  const max = Math.max(...result.categories.map(gapOf), 1);

  return (
    <div>
      {worst && (
        <p
          className="mb-6 border-l-2 pl-4 text-[14px] leading-relaxed"
          style={{ borderColor: "var(--critical)" }}
        >
          <span className="eyebrow block">Worth acting on</span>
          <span className="mt-1 block">
            Your <span className="font-medium">{worst.category}</span> predictions are the
            furthest off — {worst.stated}% confident on average against a pooled{" "}
            {worst.pooled}%, across {worst.count} decisions.
          </span>
        </p>
      )}

      <ul className="space-y-4">
        {result.categories.map((c) => (
          <li key={c.category}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[14px] font-medium tracking-tight">
                {c.category}
                <Shrinkage value={c.shrinkage} />
              </span>
              <span className="shrink-0 text-[12px] tabular-nums text-ink-secondary">
                {c.stated}% → {c.pooled}%
                <span className="ml-2 text-ink-muted">n={c.count}</span>
              </span>
            </div>

            <div
              className="mt-2 h-1.5 w-full overflow-hidden rounded-full"
              style={{ background: "var(--gridline)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(2, (gapOf(c) / max) * 100)}%`,
                  background: "var(--accent)",
                }}
              />
            </div>

            <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-ink-muted">
              <span>{Math.round(gapOf(c))} pts between said and pooled</span>
              <span>recorded {c.raw}%</span>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 border-t border-hairline pt-4 text-[12px] leading-relaxed text-ink-muted">
        Each category is pulled towards your overall {result.overall}% by an amount set by
        how much evidence it has — so a category of three decisions can&rsquo;t read as a
        finding, and one of thirty barely moves. How hard everything is pulled is fitted
        from whether the categories differ by more than chance would produce; here that
        works out at {Math.round(result.priorWeight)} decisions&rsquo; worth of pull.
      </p>
    </div>
  );
}
