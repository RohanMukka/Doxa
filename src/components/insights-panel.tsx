"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { AnalysisState } from "@/lib/actions";
import type { Insight } from "@/lib/analysis";

function RunButton({ label, tone = "ink" }: { label: string; tone?: "ink" | "quiet" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        tone === "ink"
          ? "shrink-0 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-page transition-opacity duration-200 hover:opacity-85 disabled:opacity-45"
          : "shrink-0 rounded-full border border-hairline-strong px-4 py-2 text-[13px] font-medium transition-colors duration-200 hover:bg-hairline disabled:opacity-45"
      }
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
            style={{ background: tone === "ink" ? "var(--page)" : "var(--ink)" }}
          />
          Reading your entries…
        </span>
      ) : (
        label
      )}
    </button>
  );
}

/** Where a shown read was computed, and whether producing it moved anything. */
function Provenance({ ranLocally, backend }: { ranLocally: boolean; backend: string }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 font-medium"
      style={
        ranLocally
          ? { background: "var(--good-wash)", color: "var(--good)" }
          : { background: "var(--accent-soft)", color: "var(--accent)" }
      }
    >
      {ranLocally ? `${backend} · stayed on this machine` : `${backend} · left this machine`}
    </span>
  );
}

function whenRun(d: Date) {
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function HighlightQuotes({ text }: { text: string }) {
  const parts = text.split(/('[^']+'|"[^"]+"|‘[^’]+’|“[^”]+”)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (/^['"‘“].+['"’”]$/.test(part)) {
          return (
            <mark
              key={i}
              className="rounded bg-amber-500/20 px-1.5 py-0.5 font-serif italic text-amber-200 border-b border-amber-500/40 shadow-sm"
              title="Semantic phrase attribution from journal"
            >
              {part}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export function InsightsPanel({
  insights,
  entriesAnalyzed,
  runAt,
  resolvedSince,
  ranLocally,
  backend,
  options,
  action,
  cloudAction,
}: {
  insights: Insight[] | null;
  entriesAnalyzed: number | null;
  runAt: Date | null;
  resolvedSince: number;
  ranLocally: boolean | null;
  backend: string | null;
  options: {
    localAvailable: boolean;
    cloudConfigured: boolean;
    localReady: boolean;
    exposure: { entries: number; characters: number };
  };
  action: () => Promise<AnalysisState>;
  cloudAction: () => Promise<AnalysisState>;
}) {
  const [state, formAction] = useActionState<AnalysisState, FormData>(
    async () => await action(),
    {}
  );
  const [cloudState, cloudFormAction] = useActionState<AnalysisState, FormData>(
    async () => await cloudAction(),
    {}
  );

  const hasInsights = Boolean(insights && insights.length > 0);
  const error = state.error ?? cloudState.error;

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
          {runAt && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-[12px] tabular-nums text-ink-muted">
              <span>Run {whenRun(runAt)}</span>
              {ranLocally !== null && backend && (
                <Provenance ranLocally={ranLocally} backend={backend} />
              )}
              {resolvedSince > 0 && (
                <span
                  className="rounded-full px-2 py-0.5 font-medium"
                  style={{ background: "var(--critical-wash)", color: "var(--critical)" }}
                >
                  {resolvedSince} {resolvedSince === 1 ? "decision" : "decisions"} resolved
                  since — re-run to include {resolvedSince === 1 ? "it" : "them"}
                </span>
              )}
            </p>
          )}
        </div>
        {(options.localReady || options.cloudConfigured) && (
          <form
            action={options.localReady ? formAction : cloudFormAction}
            className="pt-1"
          >
            <RunButton
              label={
                options.localReady
                  ? hasInsights
                    ? "Re-run"
                    : "Find my patterns"
                  : "Send to Google and read"
              }
              tone={options.localReady ? "ink" : "quiet"}
            />
          </form>
        )}
      </div>

      {!options.localReady && (
        <p className="mt-6 rounded-xl border border-hairline bg-surface px-4 py-3 text-[13px] leading-relaxed text-ink-secondary">
          {options.cloudConfigured ? (
            <>
              <span className="font-medium text-ink">
                No local model is running, so this read can&rsquo;t happen on your machine.
              </span>{" "}
              Going ahead sends{" "}
              <span className="tabular-nums">{options.exposure.entries}</span> resolved
              entries — about{" "}
              <span className="tabular-nums">
                {options.exposure.characters.toLocaleString()}
              </span>{" "}
              characters of your own reasoning, including everything you wrote about why —
              to Google. To keep it here instead, install Ollama and{" "}
              <code className="text-[12px]">ollama pull llama3.1:8b</code>.
            </>
          ) : (
            <>
              <span className="font-medium text-ink">Nothing to read with yet.</span> Install
              Ollama and run <code className="text-[12px]">ollama pull llama3.1:8b</code> to
              do this on your machine, or set <code className="text-[12px]">GEMINI_API_KEY</code>{" "}
              to send your entries to Google instead.
            </>
          )}
        </p>
      )}

      {error && (
        <p
          className="mt-6 rounded-xl px-4 py-3 text-[13px] leading-relaxed"
          style={{ background: "var(--critical-wash)", color: "var(--critical)" }}
          role="status"
        >
          {error}
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
                    <HighlightQuotes text={insight.evidence} />
                  </p>
                  <p className="mt-4 border-l-2 pl-4 text-[14px] leading-relaxed" style={{ borderColor: "var(--accent)" }}>
                    <span className="eyebrow block">Try instead</span>
                    <span className="mt-1 block">
                      <HighlightQuotes text={insight.tryInstead} />
                    </span>
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        !error && (
          <p className="mt-7 max-w-xl text-[14px] leading-relaxed text-ink-muted">
            Nothing read yet. The numbers below say how far off you are; this reads the
            reasoning itself to work out where it goes wrong.
          </p>
        )
      )}
    </section>
  );
}
