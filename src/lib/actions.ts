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
