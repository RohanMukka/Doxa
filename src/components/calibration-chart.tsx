"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CalibrationBucket } from "@/lib/calibration";

type Row = {
  label: string;
  stated: number | null;
  actual: number | null;
  count: number;
};

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Row }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const gap =
    row.stated !== null && row.actual !== null ? row.stated - row.actual : null;

  return (
    <div className="rounded-lg border border-hairline bg-surface px-3 py-2 text-xs shadow-sm">
      <p className="font-medium">{row.label} confidence</p>
      <p className="mt-1 text-ink-secondary">
        {row.count} {row.count === 1 ? "decision" : "decisions"}
      </p>
      <dl className="mt-2 space-y-0.5 tabular-nums">
        <div className="flex justify-between gap-6">
          <dt className="text-ink-muted">You said</dt>
          <dd>{row.stated ?? "—"}%</dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="text-ink-muted">Actually right</dt>
          <dd>{row.actual ?? "—"}%</dd>
        </div>
      </dl>
      {gap !== null && gap > 0 && (
        <p className="mt-2 border-t border-hairline pt-2 text-ink-secondary">
          {gap} pts more sure than you should have been
        </p>
      )}
    </div>
  );
}

export function CalibrationChart({ buckets }: { buckets: CalibrationBucket[] }) {
  const data: Row[] = buckets.map((b) => ({
    label: b.label,
    stated: b.statedConfidence,
    actual: b.actualAccuracy,
    count: b.count,
  }));

  return (
    <div>
      {/* Two marks are on the plot, so identity is never color-alone. */}
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <span className="flex items-center gap-2">
          <svg width="18" height="8" aria-hidden="true">
            <line
              x1="0"
              y1="4"
              x2="18"
              y2="4"
              stroke="var(--accent)"
              strokeWidth="2"
            />
            <circle cx="9" cy="4" r="3.5" fill="var(--accent)" />
          </svg>
          <span className="text-ink-secondary">How often you were right</span>
        </span>
        <span className="flex items-center gap-2">
          <svg width="18" height="8" aria-hidden="true">
            <line
              x1="0"
              y1="4"
              x2="18"
              y2="4"
              stroke="var(--axis)"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
          </svg>
          <span className="text-ink-secondary">Perfectly calibrated</span>
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 12, bottom: 4, left: -20 }}>
            <CartesianGrid stroke="var(--gridline)" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "var(--axis)" }}
              tick={{ fontSize: 12 }}
              tickMargin={8}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => `${v}%`}
              width={56}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "var(--axis)", strokeWidth: 1 }}
            />
            {/* Context: where a perfectly calibrated person would sit. */}
            <Line
              type="linear"
              dataKey="stated"
              stroke="var(--axis)"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            {/* The one series that carries the story. */}
            <Line
              type="linear"
              dataKey="actual"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
