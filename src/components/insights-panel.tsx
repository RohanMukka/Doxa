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
      className="shrink-0 rounded-md border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/5"
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

  return (
    <section className="rounded-lg border border-black/10 p-5 dark:border-white/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium">What your reasoning keeps doing</h2>
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            {entriesAnalyzed
              ? `Read across ${entriesAnalyzed} resolved decisions.`
              : "Reads every resolved entry and looks for where your certainty runs ahead of your accuracy."}
          </p>
        </div>
        <form action={formAction}>
          <RunButton hasExisting={Boolean(insights?.length)} />
        </form>
      </div>

      {state.error && (
        <p className="mt-4 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          {state.error}
        </p>
      )}

      {insights && insights.length > 0 ? (
        <ol className="mt-5 space-y-5">
          {insights.map((insight, i) => (
            <li key={i} className="border-l-2 border-black/15 pl-4 dark:border-white/15">
              <p className="font-medium leading-snug">{insight.headline}</p>
              <p className="mt-1.5 text-sm text-black/65 dark:text-white/65">{insight.evidence}</p>
              <p className="mt-2 text-sm">
                <span className="text-black/40 dark:text-white/40">Try instead: </span>
                {insight.tryInstead}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        !state.error && (
          <p className="mt-5 text-sm text-black/50 dark:text-white/50">
            Nothing read yet. The chart below shows the gap; this finds out why it&rsquo;s there.
          </p>
        )
      )}
    </section>
  );
}
