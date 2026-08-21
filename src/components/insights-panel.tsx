"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { AnalysisState } from "@/lib/actions";
import type { Insight } from "@/lib/analysis";

function RunButton({ hasExisting }: { hasExisting: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-page transition-opacity duration-200 hover:opacity-85 disabled:opacity-45"
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-page" />
          Reading your entries…
        </span>
      ) : hasExisting ? (
        "Re-run"
      ) : (
        "Find my patterns"
      )}
    </button>
  );
}

export function InsightsPanel({
  insights,
  entriesAnalyzed,
  action,
}: {
  insights: Insight[] | null;
  entriesAnalyzed: number | null;
  action: () => Promise<AnalysisState>;
}) {
  const [state, formAction] = useActionState<AnalysisState, FormData>(
    async () => await action(),
    {}
  );

  const hasInsights = Boolean(insights && insights.length > 0);

  return (
    <section className="rounded-2xl border border-hairline bg-surface-raised p-7 shadow-[var(--shadow-raised)] sm:p-9">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="eyebrow">The read</p>
          <h2 className="display mt-3 text-[26px]">What your reasoning keeps doing</h2>
          <p className="mt-2.5 max-w-xl text-[13px] leading-relaxed text-ink-secondary">
            {entriesAnalyzed
              ? `Read across ${entriesAnalyzed} resolved decisions — the words you wrote, not just the numbers.`
              : "Reads every resolved entry, looking for where your certainty runs ahead of your accuracy."}
          </p>
        </div>
        <form action={formAction} className="pt-1">
          <RunButton hasExisting={hasInsights} />
        </form>
      </div>

      {state.error && (
        <p
          className="mt-6 rounded-xl px-4 py-3 text-[13px] leading-relaxed"
          style={{ background: "var(--critical-wash)", color: "var(--critical)" }}
          role="status"
        >
          {state.error}
        </p>
      )}

      {hasInsights ? (
        <ol className="mt-8 space-y-8">
          {insights!.map((insight, i) => (
            <li
              key={i}
              className="border-t border-hairline pt-6 first:border-t-0 first:pt-0"
            >
              <div className="flex gap-5">
                <span
                  className="mt-1 shrink-0 text-[13px] font-medium tabular-nums"
                  style={{ color: "var(--accent)" }}
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="display text-[21px] leading-snug">{insight.headline}</p>
                  <p className="mt-3 text-[14px] leading-relaxed text-ink-secondary">
                    {insight.evidence}
                  </p>
                  <p className="mt-4 border-l-2 pl-4 text-[14px] leading-relaxed" style={{ borderColor: "var(--accent)" }}>
                    <span className="eyebrow block">Try instead</span>
                    <span className="mt-1 block">{insight.tryInstead}</span>
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        !state.error && (
          <p className="mt-7 max-w-xl text-[14px] leading-relaxed text-ink-muted">
            Nothing read yet. The numbers below say how far off you are; this reads the
            reasoning itself to work out where it goes wrong.
          </p>
        )
      )}
    </section>
  );
}
