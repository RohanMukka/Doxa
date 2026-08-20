"use client";

import { useState } from "react";

export function ConfidenceSlider() {
  const [value, setValue] = useState(70);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="confidence" className="text-sm font-medium">
        How confident are you? {value}%
      </label>
      <input
        type="range"
        id="confidence"
        name="confidence"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-foreground"
      />
    </div>
  );
}
