"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/actions";

const FIELD =
  "rounded-xl border border-hairline bg-surface px-3.5 py-3 text-[14px] leading-relaxed transition-colors duration-200 placeholder:text-ink-muted focus:border-hairline-strong";

/** Language for the number, so the scale means something before you've calibrated. */
function describe(v: number) {
  if (v >= 90) return "near certain";
  if (v >= 75) return "pretty sure";
  if (v >= 60) return "leaning that way";
  if (v >= 45) return "a coin flip";
  if (v >= 25) return "doubtful";
  return "a long shot";
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-ink px-6 py-2.5 text-[13px] font-medium text-page transition-opacity duration-200 hover:opacity-85 disabled:opacity-45 sm:w-auto"
    >
      {pending ? "Saving…" : "Save entry"}
    </button>
  );
}

export function EntryForm({
  action,
  defaultResolutionDate,
  defaultDecision = "",
  defaultCategory = "",
}: {
  action: (prev: FormState, data: FormData) => Promise<FormState>;
  defaultResolutionDate: string;
  defaultDecision?: string;
  defaultCategory?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const [confidence, setConfidence] = useState(70);

  return (
    <form action={formAction} className="mt-8 space-y-7">
      {state.error && (
        <p
          className="rounded-xl px-4 py-3 text-[13px]"
          style={{ background: "var(--critical-wash)", color: "var(--critical)" }}
          role="alert"
        >
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="decision" className="text-[14px] font-medium">
          What are you deciding?
        </label>
        <textarea
          id="decision"
          name="decision"
          rows={2}
          defaultValue={defaultDecision}
          placeholder="Turn down the offer and stay in my current role."
          className={FIELD}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="reasoning" className="text-[14px] font-medium">
          Why?
        </label>
        <textarea
          id="reasoning"
          name="reasoning"
          rows={4}
          placeholder="Your actual reasoning, in your own words. Don't tidy it up — the phrasing is what gets analysed later."
          className={FIELD}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="confidence" className="text-[14px] font-medium">
            How confident are you?
          </label>
          <span className="text-[13px] italic text-ink-muted">{describe(confidence)}</span>
        </div>

        <output
          htmlFor="confidence"
          className="text-[40px] font-medium leading-none tracking-tight"
          style={{ color: "var(--accent)" }}
        >
          {confidence}%
        </output>

        <input
          type="range"
          id="confidence"
          name="confidence"
          min={0}
          max={100}
          value={confidence}
          onChange={(e) => setConfidence(Number(e.target.value))}
          className="confidence mt-1 w-full"
          // Drives the filled portion of the webkit track.
          style={{ "--fill": `${confidence}%` } as React.CSSProperties}
        />

        <div className="flex justify-between text-[12px] text-ink-muted tabular-nums">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="category" className="text-[14px] font-medium">
            Category <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <input
            type="text"
            id="category"
            name="category"
            defaultValue={defaultCategory}
            placeholder="career, money, health…"
            className={FIELD}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="resolutionDate" className="text-[14px] font-medium">
            When will you know?
          </label>
          <input
            type="date"
            id="resolutionDate"
            name="resolutionDate"
            defaultValue={defaultResolutionDate}
            className={FIELD}
          />
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-hairline bg-surface p-4 text-[14px] transition-colors duration-200 hover:border-hairline-strong">
        <input
          type="checkbox"
          name="consultedOthers"
          className="mt-0.5"
          style={{ accentColor: "var(--accent)" }}
        />
        <span>
          I talked this through with someone else first
          <span className="mt-1 block text-[12px] leading-relaxed text-ink-muted">
            Tracked separately, because whether anyone checked your reasoning tends to
            predict how well the confidence holds up.
          </span>
        </span>
      </label>

      <SaveButton />
    </form>
  );
}
