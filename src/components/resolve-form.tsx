"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/actions";

/**
 * Resolution in two steps, in this order for a reason.
 *
 * The recall question has to be answered before the stored confidence comes
 * back into view, or it measures reading rather than memory. That is also why
 * the number is sealed on the card behind this form: a question you can scroll
 * up to check the answer to isn't a question.
 */

function ResolveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-page transition-opacity duration-200 hover:opacity-85 disabled:opacity-45"
    >
      {pending ? "Saving…" : "Resolve"}
    </button>
  );
}

export function ResolveForm({
  id,
  alreadyAnswered,
  action,
  recallAction,
}: {
  id: string;
  /**
   * True when the figure was already unsealed, or a recall is already on record.
   * Either way there is nothing left to ask, so the form opens on the outcome.
   */
  alreadyAnswered: boolean;
  action: (prev: FormState, data: FormData) => Promise<FormState>;
  recallAction: (
    id: string,
    recalled: number
  ) => Promise<{ stated: number } | { error: string }>;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const [step, setStep] = useState<"recall" | "outcome">(
    alreadyAnswered ? "outcome" : "recall"
  );
  const [recalled, setRecalled] = useState(70);
  // Arrives from the server only once the recall is committed. Until then the
  // client genuinely does not have it, so there is nothing to peek at.
  const [stated, setStated] = useState<number | null>(null);
  const [recallError, setRecallError] = useState<string | null>(null);
  const [submitting, startTransition] = useTransition();

  const gap = stated === null ? null : recalled - stated;

  const submitRecall = () =>
    startTransition(async () => {
      const result = await recallAction(id, recalled);
      if ("error" in result) {
        setRecallError(result.error);
        return;
      }
      setStated(result.stated);
      setStep("outcome");
    });

  return (
    <form action={formAction} className="mt-4 border-t border-hairline pt-4">
      <input type="hidden" name="id" value={id} />

      {step === "recall" ? (
        <div className="rounded-xl border border-hairline bg-page p-4">
          <label htmlFor={`recall-${id}`} className="text-[13px] font-medium">
            Before you record the outcome — how confident do you think you said you
            were?
          </label>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
            Don&rsquo;t look it up. The distance between what you said and what you
            remember saying is the measurement.
          </p>

          <output
            htmlFor={`recall-${id}`}
            className="mt-3 block text-[28px] font-medium leading-none tracking-tight tabular-nums"
            style={{ color: "var(--accent)" }}
          >
            {recalled}%
          </output>

          <input
            type="range"
            id={`recall-${id}`}
            min={0}
            max={100}
            value={recalled}
            onChange={(e) => setRecalled(Number(e.target.value))}
            className="confidence mt-2 w-full"
            style={{ "--fill": `${recalled}%` } as React.CSSProperties}
          />

          <button
            type="button"
            onClick={submitRecall}
            disabled={submitting}
            className="mt-3 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-page transition-opacity duration-200 hover:opacity-85 disabled:opacity-45"
          >
            {submitting ? "Recording…" : "That's my answer"}
          </button>

          {recallError && (
            <p className="mt-3 text-[12px]" style={{ color: "var(--critical)" }} role="alert">
              {recallError}
            </p>
          )}
        </div>
      ) : (
        <>
          {stated !== null && gap !== null && (
            <div
              className="mb-4 rounded-xl px-4 py-3 text-[13px] leading-relaxed"
              style={{
                background: Math.abs(gap) >= 10 ? "var(--critical-wash)" : "var(--accent-soft)",
              }}
            >
              You said{" "}
              <span className="font-medium tabular-nums">{stated}%</span>. You
              remembered <span className="font-medium tabular-nums">{recalled}%</span>.
              {gap === 0 ? (
                <> Exactly right.</>
              ) : (
                <>
                  {" "}
                  Your memory is{" "}
                  <span className="font-medium tabular-nums">
                    {Math.abs(gap)} points
                  </span>{" "}
                  {gap > 0 ? "more certain" : "less certain"} than you were.
                </>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`outcome-${id}`} className="text-[12px] text-ink-muted">
                How did it go?
              </label>
              <select
                id={`outcome-${id}`}
                name="outcome"
                defaultValue=""
                className="rounded-xl border border-hairline bg-page px-3 py-2 text-[13px]"
              >
                <option value="" disabled>
                  Select…
                </option>
                <option value="correct">Turned out right</option>
                <option value="incorrect">Turned out wrong</option>
              </select>
            </div>
            <div className="flex min-w-[12rem] flex-1 flex-col gap-1.5">
              <label htmlFor={`note-${id}`} className="text-[12px] text-ink-muted">
                What actually happened? <span className="opacity-70">(optional)</span>
              </label>
              <input
                id={`note-${id}`}
                type="text"
                name="resolutionNote"
                className="w-full rounded-xl border border-hairline bg-page px-3 py-2 text-[13px]"
              />
            </div>
            <ResolveButton />
          </div>
        </>
      )}

      {state.error && (
        <p className="mt-3 text-[12px]" style={{ color: "var(--critical)" }} role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
