/**
 * Form validation kept separate from the server actions so it can be tested
 * without a database. The actions do the persisting; these decide whether the
 * input deserves it.
 */

/**
 * Above this, being asked to argue the other side is worth the friction. Below
 * it the gate would fire constantly and stop being read.
 */
export const PREMORTEM_THRESHOLD = 85;

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

export type NewEntryInput = {
  decision: string;
  reasoning: string;
  confidence: number;
  category: string | null;
  consultedOthers: boolean;
  resolutionDate: Date;
  falsifier: string;
  premortem: string | null;
  premortemAssigned: boolean;
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
  premortem: unknown;
  premortemAssigned: unknown;
}): Validated<NewEntryInput> {
  const decision = String(form.decision ?? "").trim();
  const reasoning = String(form.reasoning ?? "").trim();
  const falsifier = String(form.falsifier ?? "").trim();
  const premortem = String(form.premortem ?? "").trim();
  const premortemAssigned =
    form.premortemAssigned === "on" || form.premortemAssigned === true;
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
  // Enforced server-side as well as in the form: an intervention that can be
  // skipped by disabling JavaScript isn't one, and its absence would silently
  // contaminate the group it is being measured against.
  const confidence = Math.min(100, Math.max(0, Math.round(rawConfidence)));
  if (premortemAssigned && confidence >= PREMORTEM_THRESHOLD && !premortem) {
    return {
      ok: false,
      error:
        "Write the disconfirming case first. At this confidence it is the part you are least likely to have done on your own.",
    };
  }

  return {
    ok: true,
    value: {
      decision,
      reasoning,
      confidence,
      category: String(form.category ?? "").trim() || null,
      consultedOthers: form.consultedOthers === "on" || form.consultedOthers === true,
      resolutionDate,
      falsifier,
      premortem: premortem || null,
      premortemAssigned,
    },
  };
}

export type ResolutionInput = {
  id: string;
  outcome: "correct" | "incorrect";
  resolutionNote: string | null;
  recalledConfidence: number | null;
};

export function validateResolution(form: {
  id: unknown;
  outcome: unknown;
  resolutionNote: unknown;
  recalledConfidence: unknown;
}): Validated<ResolutionInput> {
  const id = String(form.id ?? "").trim();
  const outcome = String(form.outcome ?? "");
  const rawRecalled = form.recalledConfidence;

  if (!id) return { ok: false, error: "Missing entry." };
  if (outcome !== "correct" && outcome !== "incorrect") {
    return { ok: false, error: "Pick whether it turned out right or wrong." };
  }

  // The recall is optional — an entry resolved through the API or an older
  // client simply has no answer, and a missing measurement is better than a
  // fabricated one.
  const recalled =
    rawRecalled === null || rawRecalled === undefined || rawRecalled === ""
      ? null
      : Number(rawRecalled);
  if (recalled !== null && !Number.isFinite(recalled)) {
    return { ok: false, error: "That recalled confidence isn't a number." };
  }

  return {
    ok: true,
    value: {
      id,
      outcome,
      resolutionNote: String(form.resolutionNote ?? "").trim() || null,
      recalledConfidence:
        recalled === null ? null : Math.min(100, Math.max(0, Math.round(recalled))),
    },
  };
}
