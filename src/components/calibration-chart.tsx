"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CalibrationBucket } from "@/lib/calibration";

export function CalibrationChart({ buckets }: { buckets: CalibrationBucket[] }) {
  const data = buckets.map((b) => ({
    label: b.label,
    stated: b.statedConfidence,
    actual: b.actualAccuracy,
    count: b.count,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-black/10 dark:stroke-white/10" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            stroke="currentColor"
            className="text-black/40 dark:text-white/40"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
            stroke="currentColor"
            className="text-black/40 dark:text-white/40"
            unit="%"
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid rgba(127,127,127,0.3)",
              fontSize: 12,
            }}
            formatter={(value, name) => [
              `${value}%`,
              name === "actual" ? "Actually right" : "You said",
            ]}
            labelFormatter={(label) => {
              const row = data.find((d) => d.label === label);
              return `${label} confidence · ${row?.count ?? 0} decisions`;
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => (value === "actual" ? "Actually right" : "You said")}
          />
          <Line
            type="linear"
            dataKey="stated"
            stroke="#6366f1"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 3 }}
            name="stated"
          />
          <Line
            type="linear"
            dataKey="actual"
            stroke="#f43f5e"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="actual"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
