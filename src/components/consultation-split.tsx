type Group = {
  label: string;
  stated: number | null;
  actual: number | null;
  count: number;
};

/**
 * Before/after per item — a dumbbell. One hue, two shades: what you said and
 * what actually happened, with the distance between them carrying the point.
 *
 * Laid out with CSS percentages rather than a scaled SVG viewBox, because a
 * non-uniform viewBox scale turns the markers into ellipses.
 */
export function ConsultationSplit({ groups }: { groups: Group[] }) {
  const usable = groups.filter((g) => g.stated !== null && g.actual !== null);
  if (usable.length === 0) return null;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: "var(--shade-said)" }}
            aria-hidden="true"
          />
          <span className="text-ink-secondary">You said</span>
        </span>
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: "var(--shade-right)" }}
            aria-hidden="true"
          />
          <span className="text-ink-secondary">Actually right</span>
        </span>
      </div>

      <div className="space-y-7">
        {usable.map((g) => {
          const stated = g.stated as number;
          const actual = g.actual as number;
          const gap = stated - actual;
          const lo = Math.min(stated, actual);
          const width = Math.abs(gap);

          return (
            <div key={g.label}>
              <div className="mb-2.5 flex items-baseline justify-between gap-4">
                <span className="text-sm font-medium">{g.label}</span>
                <span className="text-xs text-ink-muted tabular-nums">
                  {g.count} {g.count === 1 ? "decision" : "decisions"}
                </span>
              </div>

              <div
                className="relative h-3"
                role="img"
                aria-label={`${g.label}: said ${stated}% confident, right ${actual}% of the time`}
              >
                {/* Track */}
                <div
                  className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2"
                  style={{ background: "var(--gridline)" }}
                />
                {/* The gap itself */}
                <div
                  className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full"
                  style={{
                    left: `${lo}%`,
                    width: `${width}%`,
                    background: "var(--shade-said)",
                  }}
                />
                {/* 2px surface ring keeps the markers legible where they crowd */}
                <span
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    left: `${stated}%`,
                    background: "var(--shade-said)",
                    boxShadow: "0 0 0 2px var(--surface)",
                  }}
                />
                <span
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    left: `${actual}%`,
                    background: "var(--shade-right)",
                    boxShadow: "0 0 0 2px var(--surface)",
                  }}
                />
              </div>

              <div className="mt-2.5 flex items-baseline justify-between gap-4 text-xs tabular-nums">
                <span className="text-ink-secondary">
                  said {stated}% · right {actual}%
                </span>
                <span
                  className="font-medium"
                  style={{ color: gap > 8 ? "var(--critical)" : "var(--ink-secondary)" }}
                >
                  {gap > 0 ? `${gap} pts overconfident` : `${Math.abs(gap)} pts under`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-7 border-t border-hairline pt-4">
        <table className="w-full text-xs tabular-nums">
          <caption className="sr-only">
            Stated confidence versus actual accuracy, split by whether the decision was
            talked through with someone
          </caption>
          <thead className="text-ink-muted">
            <tr>
              <th scope="col" className="pb-1.5 text-left font-normal">
                Group
              </th>
              <th scope="col" className="pb-1.5 text-right font-normal">
                Said
              </th>
              <th scope="col" className="pb-1.5 text-right font-normal">
                Right
              </th>
              <th scope="col" className="pb-1.5 text-right font-normal">
                Decisions
              </th>
            </tr>
          </thead>
          <tbody className="text-ink-secondary">
            {usable.map((g) => (
              <tr key={g.label}>
                <th scope="row" className="py-0.5 text-left font-normal">
                  {g.label}
                </th>
                <td className="py-0.5 text-right">{g.stated}%</td>
                <td className="py-0.5 text-right">{g.actual}%</td>
                <td className="py-0.5 text-right">{g.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
