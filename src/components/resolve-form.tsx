"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/actions";

function ResolveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-page transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Saving…" : "Resolve"}
    </button>
  );
}

export function ResolveForm({
  id,
  action,
}: {
  id: string;
  action: (prev: FormState, data: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="mt-4 border-t border-hairline pt-4">
      <div className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="id" value={id} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`outcome-${id}`} className="text-xs text-ink-muted">
            How did it go?
          </label>
          <select
            id={`outcome-${id}`}
            name="outcome"
            defaultValue=""
            className="rounded-lg border border-hairline bg-page px-2.5 py-2 text-sm"
          >
            <option value="" disabled>
              Select…
            </option>
            <option value="correct">Turned out right</option>
            <option value="incorrect">Turned out wrong</option>
          </select>
        </div>
        <div className="flex min-w-[12rem] flex-1 flex-col gap-1.5">
          <label htmlFor={`note-${id}`} className="text-xs text-ink-muted">
            What actually happened? <span className="opacity-70">(optional)</span>
          </label>
          <input
            id={`note-${id}`}
            type="text"
            name="resolutionNote"
            className="w-full rounded-lg border border-hairline bg-page px-2.5 py-2 text-sm"
          />
        </div>
        <ResolveButton />
      </div>

      {state.error && (
        <p className="mt-3 text-xs" style={{ color: "var(--critical)" }} role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
