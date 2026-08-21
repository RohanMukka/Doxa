/**
 * Form validation kept separate from the server actions so it can be tested
 * without a database. The actions do the persisting; these decide whether the
 * input deserves it.
 */

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

export type NewEntryInput = {
  decision: string;
  reasoning: string;
  confidence: number;
  category: string | null;
  consultedOthers: boolean;
  resolutionDate: Date;
  falsifier: string;
};

/**
 * A date input hands back "YYYY-MM-DD". Passing that to `new Date` parses it as
 * UTC midnight, which renders as the previous day for anyone west of UTC — so
 * build the date from local parts instead.
 */
export function parseLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  // Rejects impossible dates that would otherwise roll over (2026-02-31).
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function validateNewEntry(form: {
  decision: unknown;
  reasoning: unknown;
  confidence: unknown;
  category: unknown;
  consultedOthers: unknown;
  resolutionDate: unknown;
  falsifier: unknown;
}): Validated<NewEntryInput> {
  const decision = String(form.decision ?? "").trim();
  const reasoning = String(form.reasoning ?? "").trim();
  const falsifier = String(form.falsifier ?? "").trim();
  const rawConfidence = Number(form.confidence);
  const resolutionDate = parseLocalDate(String(form.resolutionDate ?? ""));

  if (!decision) return { ok: false, error: "Write down what you're deciding." };
  if (!reasoning) {
    return { ok: false, error: "Write down why — the reasoning is what gets analysed." };
  }
  if (!falsifier) {
    return {
      ok: false,
      error:
        "Say what would make this wrong. Deciding that afterwards is how a decision quietly becomes unfalsifiable.",
    };
  }
  if (!Number.isFinite(rawConfidence)) {
    return { ok: false, error: "Pick a confidence level." };
  }
  if (!resolutionDate) {
    return { ok: false, error: "Pick a date you'll know the outcome by." };
  }

  return {
    ok: true,
    value: {
      decision,
      reasoning,
      confidence: Math.min(100, Math.max(0, Math.round(rawConfidence))),
      category: String(form.category ?? "").trim() || null,
      consultedOthers: form.consultedOthers === "on" || form.consultedOthers === true,
      resolutionDate,
      falsifier,
    },
  };
}

export type ResolutionInput = {
  id: string;
  outcome: "correct" | "incorrect";
  resolutionNote: string | null;
};

export function validateResolution(form: {
  id: unknown;
  outcome: unknown;
  resolutionNote: unknown;
}): Validated<ResolutionInput> {
  const id = String(form.id ?? "").trim();
  const outcome = String(form.outcome ?? "");

  if (!id) return { ok: false, error: "Missing entry." };
  if (outcome !== "correct" && outcome !== "incorrect") {
    return { ok: false, error: "Pick whether it turned out right or wrong." };
  }

  return {
    ok: true,
    value: {
      id,
      outcome,
      resolutionNote: String(form.resolutionNote ?? "").trim() || null,
    },
  };
}
