"use client";

import { useState } from "react";
import type { InterrogationResult } from "@/lib/interrogation";

export function SemanticHighlight({
  text,
  highlights,
}: {
  text: string;
  highlights: string[];
}) {
  if (!highlights || highlights.length === 0) return <span>{text}</span>;

  // Build regex matching any highlighted phrase
  const escaped = highlights
    .filter((h) => h && h.trim().length > 0)
    .map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (escaped.length === 0) return <span>{text}</span>;

  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) => {
        const isMatch = highlights.some(
          (h) => h.toLowerCase() === part.toLowerCase()
        );
        if (isMatch) {
          return (
            <mark
              key={i}
              className="rounded bg-amber-500/25 px-1 py-0.5 font-medium text-amber-200 border-b border-amber-500/50 shadow-sm"
              title="Quoted evidence token"
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

export function InterrogationModal({
  isOpen,
  onClose,
  result,
  onAcceptDefense,
  onRecalibrate,
  onProceedAnyway,
  decisionText,
  reasoningText,
  confidence,
}: {
  isOpen: boolean;
  onClose: () => void;
  result: InterrogationResult | null;
  onAcceptDefense: (defense: string) => void;
  onRecalibrate: (newConfidence: number) => void;
  onProceedAnyway: () => void;
  decisionText: string;
  reasoningText: string;
  confidence: number;
}) {
  const [defense, setDefense] = useState("");
  const [mode, setMode] = useState<"challenge" | "defense">("challenge");

  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-rose-500/30 bg-zinc-950 p-7 shadow-[0_0_50px_rgba(244,63,94,0.15)] sm:p-9">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="font-mono text-[12px] font-semibold uppercase tracking-wider text-rose-400">
              Adversarial Interrogation // Confidence Gate ({confidence}%)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-muted hover:text-ink text-[14px]"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-6 space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          {/* Challenge Box */}
          <div className="rounded-2xl border border-rose-500/25 bg-rose-950/20 p-5">
            <p className="eyebrow text-rose-400">The Challenge</p>
            <p className="mt-2 text-[15px] font-serif leading-relaxed text-zinc-100 italic">
              &ldquo;{result.challenge}&rdquo;
            </p>
          </div>

          {/* User Reasoning with Highlights */}
          <div className="rounded-2xl border border-hairline bg-surface/60 p-4.5">
            <p className="eyebrow text-ink-muted">Your Proposed Reasoning</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
              <SemanticHighlight text={reasoningText || decisionText} highlights={result.citedPhrases} />
            </p>
          </div>

          {/* Historical Failure Comparison */}
          {result.historicalDecision && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-950/15 p-4.5">
              <div className="flex items-baseline justify-between">
                <p className="eyebrow text-amber-400">Historical Journal Analogue</p>
                <span className="font-mono text-[11px] text-amber-400/80">
                  {result.historicalOutcomeDate} · {result.historicalConfidence}% confident · FAILED
                </span>
              </div>
              <p className="mt-2 text-[13px] font-medium text-ink">
                &ldquo;{result.historicalDecision}&rdquo;
              </p>
              {result.historicalReasoning && (
                <p className="mt-1.5 text-[12px] italic text-ink-secondary">
                  Past logic: &ldquo;{result.historicalReasoning}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Bayesian Calibration Comparison */}
          <div className="flex items-center justify-between rounded-2xl border border-hairline bg-surface-raised p-4 font-mono text-[12px]">
            <div>
              <span className="text-ink-muted">Stated Confidence: </span>
              <span className="font-bold text-rose-400 tabular-nums">{confidence}%</span>
            </div>
            <div className="text-ink-muted">→</div>
            <div>
              <span className="text-ink-muted">Empirical Median: </span>
              <span className="font-bold text-emerald-400 tabular-nums">{result.suggestedCalibration}%</span>
            </div>
            <div className="text-rose-300 font-semibold tabular-nums">
              (-{result.gapPoints} pts gap)
            </div>
          </div>

          {/* Defense Input Mode */}
          {mode === "defense" && (
            <div className="space-y-3 rounded-2xl border border-rose-500/30 bg-surface-raised p-5">
              <label htmlFor="interrogation-defense" className="text-[13px] font-medium text-ink">
                Record your counter-defense (Frozen permanently as Premortem falsification):
              </label>
              <textarea
                id="interrogation-defense"
                rows={3}
                value={defense}
                onChange={(e) => setDefense(e.target.value)}
                placeholder="What distinguishes this situation from your past failure? If you are wrong, why did it fail?"
                className="w-full rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-[13px] text-ink placeholder:text-ink-muted focus:border-hairline-strong focus:outline-none"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode("challenge")}
                  className="rounded-full px-4 py-1.5 text-[12px] text-ink-muted hover:text-ink"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => onAcceptDefense(defense)}
                  className="rounded-full bg-ink px-5 py-2 text-[12px] font-medium text-page hover:opacity-90"
                >
                  Commit Entry With Defense
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {mode === "challenge" && (
          <div className="mt-6 flex flex-col gap-2.5 border-t border-hairline pt-5 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onProceedAnyway}
              className="text-[12px] text-ink-muted hover:text-ink underline sm:order-1"
            >
              Proceed without adjustment
            </button>

            <div className="flex flex-wrap items-center gap-2 sm:order-2">
              <button
                type="button"
                onClick={() => onRecalibrate(result.suggestedCalibration)}
                className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 font-mono text-[12px] font-medium text-emerald-400 hover:bg-emerald-500/20 active:scale-95"
              >
                Recalibrate to {result.suggestedCalibration}%
              </button>

              <button
                type="button"
                onClick={() => setMode("defense")}
                className="rounded-full bg-rose-600 px-5 py-2 text-[12px] font-medium text-white shadow-sm hover:bg-rose-500 active:scale-95"
              >
                Defend My Stance
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
