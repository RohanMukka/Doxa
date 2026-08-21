"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BandPoint } from "@/lib/recalibration";

/**
 * The fitted distortion, with the posterior drawn as a band.
 *
 * Replaces five points carrying error bars wide enough to swallow any finding.
 * The band is not five separate intervals stitched together — it is one
 * two-parameter model's uncertainty, so it borrows strength across the whole
 * scale instead of estimating each bucket alone, and it narrows where the
 * journal actually has decisions.
 */

type Row = BandPoint & { perfect: number };

type BucketDot = { stated: number; actual: number; count: number };

function FanTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Row }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const gap = row.stated - row.median;

  return (
    <div className="max-w-64 rounded-lg border border-hairline bg-surface px-3 py-2 text-xs shadow-sm">
      <p className="font-medium tabular-nums">When you say {Math.round(row.stated)}%</p>
      <dl className="mt-2 space-y-0.5 tabular-nums">
        <div className="flex justify-between gap-6">
          <dt className="text-ink-muted">You&rsquo;re right about</dt>
          <dd>{Math.round(row.median)}%</dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="text-ink-muted">95% range</dt>
          <dd>
            {Math.round(row.low)}–{Math.round(row.high)}%
          </dd>
        </div>
      </dl>
      {Math.abs(gap) >= 2 && (
        <p className="mt-2 border-t border-hairline pt-2 leading-relaxed text-ink-secondary">
          {gap > 0
            ? `${Math.round(gap)} pts more sure than the outcomes bear out`
            : `${Math.round(Math.abs(gap))} pts less sure than you could be`}
        </p>
      )}
    </div>
  );
}

function LegendKey({ children, swatch }: { children: React.ReactNode; swatch: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      {swatch}
      <span className="text-ink-secondary">{children}</span>
    </span>
  );
}

export function CalibrationFan({
  band,
  buckets,
  anchors,
}: {
  band: BandPoint[];
  /** The raw bucket rates, so the curve visibly comes from somewhere. */
  buckets: BucketDot[];
  /** A few stated values spelled out, rather than a number on every point. */
  anchors: { stated: number; median: number; low: number; high: number }[];
}) {
  const data: Row[] = band.map((p) => ({ ...p, perfect: p.stated }));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <LegendKey
          swatch={
            <svg width="18" height="10" aria-hidden="true">
              <rect x="0" y="1" width="18" height="8" fill="var(--accent)" opacity="0.16" />
              <line x1="0" y1="5" x2="18" y2="5" stroke="var(--accent)" strokeWidth="2" />
            </svg>
          }
        >
          How often you&rsquo;re actually right, with its 95% range
        </LegendKey>
        <LegendKey
          swatch={
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
          }
        >
          Perfectly calibrated
        </LegendKey>
        <LegendKey
          swatch={
            <svg width="10" height="10" aria-hidden="true">
              <circle
                cx="5"
                cy="5"
                r="3"
                fill="var(--surface)"
                stroke="var(--ink-muted)"
                strokeWidth="1.5"
              />
            </svg>
          }
        >
          Your decisions, grouped
        </LegendKey>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 14, bottom: 4, left: -20 }}>
            <CartesianGrid stroke="var(--gridline)" vertical={false} />
            <XAxis
              type="number"
              dataKey="stated"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickLine={false}
              axisLine={{ stroke: "var(--axis)" }}
              tick={{ fontSize: 12 }}
              tickMargin={8}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="number"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => `${v}%`}
              width={56}
            />
            <Tooltip
              content={<FanTooltip />}
              cursor={{ stroke: "var(--axis)", strokeWidth: 1 }}
            />

            <Area
              type="monotone"
              dataKey={(d: Row) => [d.low, d.high]}
              stroke="none"
              fill="var(--accent)"
              fillOpacity={0.16}
              isAnimationActive={false}
              activeDot={false}
            />
            <Line
              type="linear"
              dataKey="perfect"
              stroke="var(--axis)"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="median"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 5,
                fill: "var(--accent)",
                stroke: "var(--surface)",
                strokeWidth: 2,
              }}
              isAnimationActive={false}
            />
            <Scatter
              data={buckets}
              dataKey="actual"
              isAnimationActive={false}
              shape={(props: unknown) => {
                const { cx, cy } = props as { cx: number; cy: number };
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={3.5}
                    fill="var(--surface)"
                    stroke="var(--ink-muted)"
                    strokeWidth={1.5}
                  />
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <table className="mt-5 w-full text-[12px] tabular-nums">
        <caption className="sr-only">
          Stated confidence against how often it turned out right, with 95% ranges
        </caption>
        <thead className="text-ink-muted">
          <tr className="text-left">
            <th scope="col" className="font-normal">When you say</th>
            <th scope="col" className="text-right font-normal">You&rsquo;re right about</th>
            <th scope="col" className="text-right font-normal">95% range</th>
          </tr>
        </thead>
        <tbody>
          {anchors.map((a) => (
            <tr key={a.stated} className="border-t border-hairline">
              <td className="py-1">{a.stated}%</td>
              <td className="py-1 text-right font-medium">{Math.round(a.median)}%</td>
              <td className="py-1 text-right text-ink-muted">
                {Math.round(a.low)}–{Math.round(a.high)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
