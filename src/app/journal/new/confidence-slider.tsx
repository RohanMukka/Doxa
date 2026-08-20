"use client";

import { useState } from "react";

/** Language for the number, so the scale means something before you've calibrated. */
function describe(v: number) {
  if (v >= 90) return "near certain";
  if (v >= 75) return "pretty sure";
  if (v >= 60) return "leaning that way";
  if (v >= 45) return "a coin flip";
  if (v >= 25) return "doubtful";
  return "a long shot";
}

export function ConfidenceSlider() {
  const [value, setValue] = useState(70);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor="confidence" className="text-sm font-medium">
          How confident are you?
        </label>
        <span className="text-sm text-ink-muted">{describe(value)}</span>
      </div>

      <output
        htmlFor="confidence"
        className="text-4xl font-semibold tracking-tight"
        style={{ color: "var(--accent)" }}
      >
        {value}%
      </output>

      <input
        type="range"
        id="confidence"
        name="confidence"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="mt-1 w-full"
        style={{ accentColor: "var(--accent)" }}
      />

      <div className="flex justify-between text-xs text-ink-muted tabular-nums">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
