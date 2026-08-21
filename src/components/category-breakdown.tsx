import type { CategoryStats } from "@/lib/calibration";
import { THIN_CATEGORY } from "@/lib/calibration";

/**
 * Global calibration says *whether* you're off; this says *where*. Every row
 * shows its n, and thin rows are marked rather than hidden — the sample size is
 * the caveat, so it belongs on screen next to the number.
 */
export function CategoryBreakdown({
  categories,
  worst,
}: {
  categories: CategoryStats[];
  worst: CategoryStats | null;
}) {
  if (categories.length === 0) return null;

  const max = Math.max(...categories.map((c) => c.ece), 1);

  return (
    <div>
      {worst && (
        <p className="mb-6 border-l-2 pl-4 text-[14px] leading-relaxed" style={{ borderColor: "var(--critical)" }}>
          <span className="eyebrow block">Worth acting on</span>
          <span className="mt-1 block">
            Your <span className="font-medium">{worst.category}</span> predictions are the
            furthest off — {worst.stated}% confident on average, right {worst.actual}% of the
            time, across {worst.count} decisions.
          </span>
        </p>
      )}

      <ul className="space-y-4">
        {categories.map((c) => (
          <li key={c.category}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[14px] font-medium tracking-tight">
                {c.category}
                {c.thin && (
                  <span className="ml-2 text-[11px] font-normal text-ink-muted">
                    too few to lean on
                  </span>
                )}
              </span>
              <span className="shrink-0 text-[12px] tabular-nums text-ink-secondary">
                {c.stated}% → {c.actual}%
                <span className="ml-2 text-ink-muted">n={c.count}</span>
              </span>
            </div>

            {/* Bar length is calibration error; thin categories read as outline
                only, so a two-entry category can't look like a finding. */}
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--gridline)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(2, (c.ece / max) * 100)}%`,
                  background: c.thin ? "var(--axis)" : "var(--accent)",
                  opacity: c.thin ? 0.6 : 1,
                }}
              />
            </div>

            <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-ink-muted">
              <span>{c.ece} pts calibration error</span>
              <span>Brier {c.brier}</span>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 border-t border-hairline pt-4 text-[12px] leading-relaxed text-ink-muted">
        Categories with fewer than {THIN_CATEGORY} resolved decisions are shown but not
        ranked — at that size the number is mostly noise.
      </p>
    </div>
  );
}
