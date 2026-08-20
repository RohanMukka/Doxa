"use client";

import {
  CartesianGrid,
  ErrorBar,
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
  stated: number;
  actual: number;
  count: number;
  thin: boolean;
  low: number;
  high: number;
  /** Distance from the point to each end of the interval, as Recharts wants it. */
  error: [number, number];
};

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const gap = row.stated - row.actual;

  return (
    <div className="max-w-64 rounded-lg border border-hairline bg-surface px-3 py-2 text-xs shadow-sm">
      <p className="font-medium">{row.label} confidence</p>
      <p className="mt-1 text-ink-secondary tabular-nums">
        {row.count} {row.count === 1 ? "decision" : "decisions"}
      </p>
      <dl className="mt-2 space-y-0.5 tabular-nums">
        <div className="flex justify-between gap-6">
          <dt className="text-ink-muted">You said</dt>
          <dd>{row.stated}%</dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="text-ink-muted">Actually right</dt>
          <dd>
            {row.actual}%{" "}
            <span className="text-ink-muted">
              ({row.low}–{row.high})
            </span>
          </dd>
        </div>
      </dl>
      {row.thin ? (
        <p className="mt-2 border-t border-hairline pt-2 leading-relaxed text-ink-muted">
          Too few decisions here to read anything into — the range above is most of the
          scale.
        </p>
      ) : (
        gap !== 0 && (
          <p className="mt-2 border-t border-hairline pt-2 text-ink-secondary">
            {gap > 0
              ? `${gap} pts more sure than the outcomes justified`
              : `${Math.abs(gap)} pts less sure than you needed to be`}
          </p>
        )
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
    thin: b.thin,
    low: b.low,
    high: b.high,
    error: [b.actualAccuracy - b.low, b.high - b.actualAccuracy],
  }));

  const hasThin = data.some((d) => d.thin);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <span className="flex items-center gap-2">
          <svg width="18" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="18" y2="4" stroke="var(--accent)" strokeWidth="2" />
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
        <span className="flex items-center gap-2">
          <svg width="10" height="12" aria-hidden="true">
            <line x1="5" y1="1" x2="5" y2="11" stroke="var(--axis)" strokeWidth="1.5" />
            <line x1="1" y1="1" x2="9" y2="1" stroke="var(--axis)" strokeWidth="1.5" />
            <line x1="1" y1="11" x2="9" y2="11" stroke="var(--axis)" strokeWidth="1.5" />
          </svg>
          <span className="text-ink-secondary">95% range</span>
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
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--axis)", strokeWidth: 1 }} />
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
            <Line
              type="linear"
              dataKey="actual"
              stroke="var(--accent)"
              strokeWidth={2}
              isAnimationActive={false}
              dot={(props) => {
                const { cx, cy, payload, index } = props as {
                  cx: number;
                  cy: number;
                  payload: Row;
                  index: number;
                };
                // A bucket of two decisions shouldn't look as solid as a bucket
                // of twenty, so thin ones are drawn hollow.
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={payload.thin ? "var(--surface)" : "var(--accent)"}
                    stroke="var(--accent)"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 6, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
            >
              <ErrorBar
                dataKey="error"
                width={5}
                strokeWidth={1.5}
                stroke="var(--axis)"
                direction="y"
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {hasThin && (
        <p className="mt-3 text-xs leading-relaxed text-ink-muted">
          Hollow points sit on a handful of decisions each — their true rate could be almost
          anywhere in the bar. They&rsquo;ll firm up as you log more.
        </p>
      )}
    </div>
  );
}
