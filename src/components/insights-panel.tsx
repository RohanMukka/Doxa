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
      className="shrink-0 rounded-lg bg-ink px-3.5 py-2 text-xs font-medium text-page transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Reading your entries…" : hasExisting ? "Re-run" : "Find my patterns"}
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
    <section className="rounded-xl border border-hairline bg-surface p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">What your reasoning keeps doing</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
            {entriesAnalyzed
              ? `Read across ${entriesAnalyzed} resolved decisions.`
              : "Reads every resolved entry, looking for where your certainty runs ahead of your accuracy."}
          </p>
        </div>
        <form action={formAction}>
          <RunButton hasExisting={hasInsights} />
        </form>
      </div>

      {state.error && (
        <p
          className="mt-5 rounded-lg px-3 py-2.5 text-xs leading-relaxed"
          style={{ background: "var(--critical-wash)", color: "var(--critical)" }}
          role="status"
        >
          {state.error}
        </p>
      )}

      {hasInsights ? (
        <ol className="mt-6 space-y-6">
          {insights!.map((insight, i) => (
            <li key={i} className="relative pl-9">
              <span
                className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
                style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <p className="font-medium leading-snug">{insight.headline}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                {insight.evidence}
              </p>
              <p className="mt-2.5 text-sm leading-relaxed">
                <span className="text-ink-muted">Try instead — </span>
                {insight.tryInstead}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        !state.error && (
          <p className="mt-5 text-sm leading-relaxed text-ink-muted">
            Nothing read yet. The numbers below say how far off you are; this reads the
            reasoning itself to work out where it goes wrong.
          </p>
        )
      )}
    </section>
  );
}
