"use client";

import { useState, useMemo } from "react";
import {
  fitRecalibration,
  calibrationBand,
  recalibrate,
  type BandPoint,
} from "@/lib/recalibration";
import {
  calibrationCurve,
  averageConfidence,
  accuracyFor,
  calibrationGap,
  expectedCalibrationError,
  brierScore,
  type ResolvedEntry,
} from "@/lib/calibration";
import { decomposeBrier } from "@/lib/discrimination";

export type SandboxEntry = {
  id: string;
  decision: string;
  confidence: number;
  consultedOthers: boolean;
  outcome: "correct" | "incorrect";
  category: string | null;
};

type Props = {
  initialEntries: SandboxEntry[];
};

export function CounterfactualSandbox({ initialEntries }: Props) {
  const [adjustment, setAdjustment] = useState<number>(0);
  const [targetScope, setTargetScope] = useState<"solo" | "all" | "high">("solo");
  const [showObservedComparison, setShowObservedComparison] = useState<boolean>(true);

  // Baseline (Real Observed Data)
  const baseline = useMemo(() => {
    const entries: ResolvedEntry[] = initialEntries.map((e) => ({
      confidence: e.confidence,
      outcome: e.outcome,
      consultedOthers: e.consultedOthers,
      category: e.category,
    }));
    const fit = fitRecalibration(entries);
    const band = fit ? calibrationBand(fit) : [];
    const brier = brierScore(entries);
    const parts = decomposeBrier(entries);
    const gap = calibrationGap(entries);
    const ece = expectedCalibrationError(entries);
    const stated = averageConfidence(entries);
    const actual = accuracyFor(entries);
    const buckets = calibrationCurve(entries);

    return { entries, fit, band, brier, parts, gap, ece, stated, actual, buckets };
  }, [initialEntries]);

  // Counterfactual Simulation
  const simulated = useMemo(() => {
    const shiftedEntries: ResolvedEntry[] = initialEntries.map((e) => {
      let applies = false;
      if (targetScope === "solo" && !e.consultedOthers) applies = true;
      else if (targetScope === "all") applies = true;
      else if (targetScope === "high" && e.confidence >= 80) applies = true;

      const newConfidence = applies
        ? Math.max(1, Math.min(99, Math.round(e.confidence + adjustment)))
        : e.confidence;

      return {
        confidence: newConfidence,
        outcome: e.outcome,
        consultedOthers: e.consultedOthers,
        category: e.category,
      };
    });

    const fit = fitRecalibration(shiftedEntries);
    const band = fit ? calibrationBand(fit) : [];
    const brier = brierScore(shiftedEntries);
    const parts = decomposeBrier(shiftedEntries);
    const gap = calibrationGap(shiftedEntries);
    const ece = expectedCalibrationError(shiftedEntries);
    const stated = averageConfidence(shiftedEntries);
    const actual = accuracyFor(shiftedEntries);
    const buckets = calibrationCurve(shiftedEntries);

    const brierDelta = brier !== null && baseline.brier !== null ? brier - baseline.brier : 0;
    const relDelta =
      parts && baseline.parts ? parts.reliability - baseline.parts.reliability : 0;
    const gapDelta = gap !== null && baseline.gap !== null ? Math.abs(gap) - Math.abs(baseline.gap) : 0;

    return {
      fit,
      band,
      brier,
      parts,
      gap,
      ece,
      stated,
      actual,
      buckets,
      brierDelta,
      relDelta,
      gapDelta,
    };
  }, [initialEntries, adjustment, targetScope, baseline]);

  // SVG Chart Dimensions
  const width = 600;
  const height = 280;
  const padding = { top: 20, right: 25, bottom: 35, left: 45 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const toX = (val: number) => padding.left + (val / 100) * plotWidth;
  const toY = (val: number) => padding.top + plotHeight - (val / 100) * plotHeight;

  // Build SVG Path for Band Area
  const buildBandPath = (band: BandPoint[]) => {
    if (band.length === 0) return "";
    const topPoints = band.map((p) => `${toX(p.stated)},${toY(p.high)}`).join(" L ");
    const bottomPoints = [...band]
      .reverse()
      .map((p) => `${toX(p.stated)},${toY(p.low)}`)
      .join(" L ");
    return `M ${topPoints} L ${bottomPoints} Z`;
  };

  const buildLinePath = (band: BandPoint[]) => {
    if (band.length === 0) return "";
    return band
      .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.stated)},${toY(p.median)}`)
      .join(" ");
  };

  return (
    <div className="space-y-6">
      {/* Control Drawer */}
      <div className="rounded-2xl border border-hairline bg-surface/80 p-6 backdrop-blur-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
              <h3 className="text-[15px] font-medium tracking-tight text-ink">
                Counterfactual Sandbox // Recalibration Laboratory
              </h3>
            </div>
            <p className="mt-1 text-[13px] text-ink-secondary">
              Simulate: &ldquo;What if you had tempered or scaled your confidence before deciding?&rdquo;
            </p>
          </div>

          {/* Scope Selector */}
          <div className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface-raised p-1 text-[12px]">
            <button
              type="button"
              onClick={() => setTargetScope("solo")}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                targetScope === "solo"
                  ? "bg-ink text-page"
                  : "text-ink-secondary hover:text-ink"
              }`}
            >
              Solo Decisions
            </button>
            <button
              type="button"
              onClick={() => setTargetScope("high")}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                targetScope === "high"
                  ? "bg-ink text-page"
                  : "text-ink-secondary hover:text-ink"
              }`}
            >
              High Certainty (&ge;80%)
            </button>
            <button
              type="button"
              onClick={() => setTargetScope("all")}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                targetScope === "all"
                  ? "bg-ink text-page"
                  : "text-ink-secondary hover:text-ink"
              }`}
            >
              All Decisions
            </button>
          </div>
        </div>

        {/* Dynamic Adjustment Slider */}
        <div className="mt-6 space-y-3">
          <div className="flex items-baseline justify-between">
            <label htmlFor="counterfactual-adjustment" className="text-[13px] font-medium text-ink">
              Hypothetical Confidence Shift:{" "}
              <span
                className={`font-mono text-[16px] font-bold tabular-nums ${
                  adjustment < 0
                    ? "text-emerald-400"
                    : adjustment > 0
                      ? "text-rose-400"
                      : "text-sky-400"
                }`}
              >
                {adjustment > 0 ? `+${adjustment}` : adjustment}%
              </span>
            </label>
            <button
              type="button"
              onClick={() => setAdjustment(0)}
              className="text-[11px] font-mono text-ink-muted hover:text-ink underline"
            >
              Reset to 0%
            </button>
          </div>

          <input
            type="range"
            id="counterfactual-adjustment"
            min={-30}
            max={30}
            step={1}
            value={adjustment}
            onChange={(e) => setAdjustment(Number(e.target.value))}
            className="confidence w-full"
            style={
              {
                "--fill": `${((adjustment + 30) / 60) * 100}%`,
                "--slider-color":
                  adjustment < 0
                    ? "var(--good)"
                    : adjustment > 0
                      ? "var(--critical)"
                      : "var(--accent)",
              } as React.CSSProperties
            }
          />

          <div className="flex justify-between font-mono text-[11px] text-ink-muted tabular-nums">
            <span>-30% (Deflate)</span>
            <span>0% (Observed)</span>
            <span>+30% (Inflate)</span>
          </div>
        </div>

        {/* Live Delta Readout */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-[12px]">
          <div className="rounded-xl border border-hairline bg-surface-raised p-3">
            <div className="text-ink-muted text-[11px]">CALIBRATION GAP</div>
            <div className="mt-1 text-[18px] font-bold tabular-nums text-ink">
              {simulated.gap !== null ? `${Math.abs(simulated.gap)} pts` : "—"}
            </div>
            <div
              className={`text-[11px] tabular-nums ${
                simulated.gapDelta < 0 ? "text-emerald-400" : simulated.gapDelta > 0 ? "text-rose-400" : "text-ink-muted"
              }`}
            >
              {simulated.gapDelta < 0 ? `▼ ${Math.abs(Math.round(simulated.gapDelta))} pts closer` : simulated.gapDelta > 0 ? `▲ +${Math.round(simulated.gapDelta)} pts worse` : "baseline"}
            </div>
          </div>

          <div className="rounded-xl border border-hairline bg-surface-raised p-3">
            <div className="text-ink-muted text-[11px]">BRIER SCORE</div>
            <div className="mt-1 text-[18px] font-bold tabular-nums text-ink">
              {simulated.brier !== null ? simulated.brier.toFixed(3) : "—"}
            </div>
            <div
              className={`text-[11px] tabular-nums ${
                simulated.brierDelta < -0.001
                  ? "text-emerald-400"
                  : simulated.brierDelta > 0.001
                    ? "text-rose-400"
                    : "text-ink-muted"
              }`}
            >
              {simulated.brierDelta < 0
                ? `▼ ${(simulated.brierDelta).toFixed(3)} (better)`
                : simulated.brierDelta > 0
                  ? `▲ +${(simulated.brierDelta).toFixed(3)} (worse)`
                  : "baseline"}
            </div>
          </div>

          <div className="rounded-xl border border-hairline bg-surface-raised p-3">
            <div className="text-ink-muted text-[11px]">MISCALIBRATION</div>
            <div className="mt-1 text-[18px] font-bold tabular-nums text-ink">
              {simulated.parts ? simulated.parts.reliability.toFixed(3) : "—"}
            </div>
            <div
              className={`text-[11px] tabular-nums ${
                simulated.relDelta < -0.001 ? "text-emerald-400" : simulated.relDelta > 0.001 ? "text-rose-400" : "text-ink-muted"
              }`}
            >
              {simulated.relDelta < 0 ? "▼ reduced error" : simulated.relDelta > 0 ? "▲ higher error" : "baseline"}
            </div>
          </div>

          <div className="rounded-xl border border-hairline bg-surface-raised p-3">
            <div className="text-ink-muted text-[11px]">DISCRIMINATION</div>
            <div className="mt-1 text-[18px] font-bold tabular-nums text-sky-400">
              {simulated.parts ? simulated.parts.resolution.toFixed(3) : "—"}
            </div>
            <div className="text-ink-muted text-[11px]">preserved edge</div>
          </div>
        </div>

        {/* Counterfactual Insight Statement */}
        {adjustment !== 0 && (
          <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-950/20 p-3.5 text-[13px] leading-relaxed text-emerald-300">
            {adjustment < 0 ? (
              <>
                <span className="font-semibold text-emerald-400">Recalibration Takeaway:</span> Deflating {targetScope === "solo" ? "un-consulted bets" : targetScope === "high" ? "high-confidence bets" : "decisions"} by{" "}
                <span className="font-mono font-bold tabular-nums">{Math.abs(adjustment)}%</span> improves your overall Brier score to{" "}
                <span className="font-mono font-bold tabular-nums">{simulated.brier?.toFixed(3)}</span>, pulling your stated confidence into tighter alignment with reality without reducing your discrimination power.
              </>
            ) : (
              <>
                <span className="font-semibold text-rose-400">Overconfidence Takeaway:</span> Adding an extra{" "}
                <span className="font-mono font-bold tabular-nums">{adjustment}%</span> of unearned certainty inflates your calibration error by{" "}
                <span className="font-mono font-bold tabular-nums">+{Math.abs(Math.round(simulated.gapDelta))} points</span>, penalizing your Brier score.
              </>
            )}
          </div>
        )}
      </div>

      {/* SVG Interactive Calibration Chart */}
      <div className="relative rounded-2xl border border-hairline bg-surface-raised p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[12px]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="font-medium text-ink">
                {adjustment !== 0 ? `Counterfactual (${adjustment > 0 ? "+" : ""}${adjustment}%)` : "Current Recalibrated Model"}
              </span>
            </span>
            {adjustment !== 0 && showObservedComparison && (
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-500" />
                <span className="text-ink-secondary">Observed Baseline</span>
              </span>
            )}
            <span className="flex items-center gap-2">
              <span className="h-0.5 w-3 border-t border-dashed border-zinc-400" />
              <span className="text-ink-muted">Ideal Calibration (Diagonal)</span>
            </span>
          </div>

          {adjustment !== 0 && (
            <button
              type="button"
              onClick={() => setShowObservedComparison(!showObservedComparison)}
              className="text-[11px] font-mono text-ink-muted hover:text-ink underline"
            >
              {showObservedComparison ? "Hide Baseline Overlay" : "Show Baseline Overlay"}
            </button>
          )}
        </div>

        <div className="mt-4 w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-[300px] select-none font-mono text-[11px]">
            {/* Gridlines */}
            {[0, 25, 50, 75, 100].map((val) => (
              <g key={val}>
                <line
                  x1={toX(val)}
                  y1={toY(0)}
                  x2={toX(val)}
                  y2={toY(100)}
                  stroke="var(--gridline)"
                  strokeDasharray="2 4"
                />
                <line
                  x1={toX(0)}
                  y1={toY(val)}
                  x2={toX(100)}
                  y2={toY(val)}
                  stroke="var(--gridline)"
                  strokeDasharray="2 4"
                />
                <text x={toX(val)} y={height - 10} textAnchor="middle" fill="var(--ink-muted)">
                  {val}%
                </text>
                <text x={padding.left - 10} y={toY(val) + 4} textAnchor="end" fill="var(--ink-muted)">
                  {val}%
                </text>
              </g>
            ))}

            {/* Ideal Calibration Diagonal */}
            <line
              x1={toX(0)}
              y1={toY(0)}
              x2={toX(100)}
              y2={toY(100)}
              stroke="var(--axis)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            {/* Baseline Overlay when shifted */}
            {adjustment !== 0 && showObservedComparison && baseline.band.length > 0 && (
              <>
                <path
                  d={buildBandPath(baseline.band)}
                  fill="rgba(113, 113, 122, 0.12)"
                />
                <path
                  d={buildLinePath(baseline.band)}
                  fill="none"
                  stroke="#71717a"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              </>
            )}

            {/* Counterfactual Band Area */}
            {simulated.band.length > 0 && (
              <path
                d={buildBandPath(simulated.band)}
                fill="rgba(16, 185, 129, 0.16)"
                className="transition-all duration-300"
              />
            )}

            {/* Counterfactual Median Curve */}
            {simulated.band.length > 0 && (
              <path
                d={buildLinePath(simulated.band)}
                fill="none"
                stroke="var(--good)"
                strokeWidth="2.5"
                className="transition-all duration-300"
              />
            )}

            {/* Observed Bucket Dots */}
            {simulated.buckets.map((b) => (
              <g key={b.label}>
                <circle
                  cx={toX(b.statedConfidence)}
                  cy={toY(b.actualAccuracy)}
                  r={Math.max(3, Math.min(7, Math.sqrt(b.count) * 2))}
                  fill="var(--surface-raised)"
                  stroke="var(--good)"
                  strokeWidth="2"
                />
              </g>
            ))}
          </svg>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-ink-muted">
          <span>X: Stated Confidence</span>
          <span>Y: Empirical Hit Rate</span>
        </div>
      </div>
    </div>
  );
}
