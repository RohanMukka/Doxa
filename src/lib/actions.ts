"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateAnalysis } from "@/lib/analysis";
import { append } from "@/lib/journal/log";
import { validateNewEntry, validateResolution } from "@/lib/validation";

export type FormState = { error?: string };

function refresh() {
  revalidatePath("/journal");
  revalidatePath("/");
}

export async function createEntry(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const result = validateNewEntry({
    decision: formData.get("decision"),
    reasoning: formData.get("reasoning"),
    confidence: formData.get("confidence"),
    category: formData.get("category"),
    consultedOthers: formData.get("consultedOthers"),
    resolutionDate: formData.get("resolutionDate"),
    falsifier: formData.get("falsifier"),
  });

  if (!result.ok) return { error: result.error };
  const v = result.value;

  // Nothing writes to `Entry` directly any more. The event is the record; the
  // row is a convenience derived from it.
  await append([
    {
      type: "DecisionMade",
      entryId: randomUUID(),
      payload: {
        decision: v.decision,
        reasoning: v.reasoning,
        confidence: v.confidence,
        category: v.category,
        consultedOthers: v.consultedOthers,
        resolutionDate: v.resolutionDate.toISOString(),
        falsifier: v.falsifier,
      },
    },
  ]);

  refresh();
  redirect("/journal");
}

export async function resolveEntry(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const result = validateResolution({
    id: formData.get("id"),
    outcome: formData.get("outcome"),
    resolutionNote: formData.get("resolutionNote"),
    recalledConfidence: formData.get("recalledConfidence"),
  });

  if (!result.ok) return { error: result.error };
  const { id, outcome, resolutionNote } = result.value;

  const existing = await prisma.entry.findUnique({ where: { id } });
  if (!existing) return { error: "That entry no longer exists." };
  if (existing.status === "resolved") return { error: "That one is already resolved." };

  await append([
    {
      type: "OutcomeRecorded",
      entryId: id,
      payload: { outcome, resolutionNote, adjudication: "self" },
    },
  ]);

  refresh();
  return {};
}

/**
 * Records what the person thinks they said, then — and only then — returns what
 * they actually said.
 *
 * The order is the point. The stated confidence never reaches the browser until
 * the recall is committed to the log, so the answer cannot be read out of the
 * page and handed back as a memory. Doing this as a round-trip rather than in
 * client state is the difference between a protocol and a convention.
 */
export async function recallConfidence(
  id: string,
  recalled: number
): Promise<{ stated: number } | { error: string }> {
  if (!Number.isFinite(recalled)) return { error: "That isn't a number." };

  const existing = await prisma.entry.findUnique({ where: { id } });
  if (!existing) return { error: "That entry no longer exists." };
  if (existing.status === "resolved") return { error: "That one is already resolved." };

  if (existing.recalledConfidence === null) {
    await append([
      {
        type: "ConfidenceRecalled",
        entryId: id,
        payload: {
          recalledConfidence: Math.min(100, Math.max(0, Math.round(recalled))),
          // Decided here from the log, never from what the form claims: a client
          // that lied about having been blind would poison the one statistic
          // this mechanism exists to produce.
          blind: existing.confidenceRevealedAt === null,
        },
      },
    ]);
    refresh();
  }

  return { stated: existing.confidence };
}

/**
 * Unseals the stated confidence on an open decision. Allowed, but recorded:
 * once you've looked, your later recollection of the number isn't evidence
 * about your memory any more, and the hindsight statistics drop that entry.
 */
export async function revealConfidence(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const existing = await prisma.entry.findUnique({ where: { id } });
  if (!existing || existing.status === "resolved" || existing.confidenceRevealedAt) {
    return;
  }

  await append([{ type: "ConfidenceRevealed", entryId: id, payload: {} }]);
  refresh();
}

export type AnalysisState = { error?: string };

export async function runAnalysis(): Promise<AnalysisState> {
  if (!process.env.GEMINI_API_KEY) {
    return { error: "Set GEMINI_API_KEY in .env to run the analysis." };
  }

  try {
    await generateAnalysis();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Analysis failed." };
  }

  revalidatePath("/");
  return {};
}
