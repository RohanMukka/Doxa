import Link from "next/link";
import { STARTERS, horizonDate } from "@/lib/starters";

/**
 * The answer to "this is useless until I've used it for a year". Calibration
 * transfers across topics, so a fortnight of short-horizon predictions gives
 * you a real baseline to carry into the slow, consequential decisions.
 */
export function StarterList() {
  return (
    <section className="rounded-xl border border-hairline bg-surface p-6">
      <h2 className="text-sm font-semibold">Start with something that resolves this week</h2>
      <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-ink-secondary">
        Calibration is a general habit, not a per-topic one — if you say 90% when you mean
        70%, that shows up on small predictions too. Log a handful of these and you&rsquo;ll
        have a baseline in a fortnight instead of a year, ready for the decisions that
        actually matter.
      </p>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {STARTERS.map((s) => (
          <li key={s.decision}>
            <Link
              href={{
                pathname: "/journal/new",
                query: {
                  decision: s.decision,
                  category: s.category,
                  resolutionDate: horizonDate(s.horizonDays),
                },
              }}
              className="flex h-full flex-col justify-between gap-2 rounded-lg border border-hairline p-3 transition-colors hover:bg-hairline"
            >
              <span className="text-sm leading-snug">{s.decision}</span>
              <span className="text-xs text-ink-muted tabular-nums">
                settles in {s.horizonDays} days
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
