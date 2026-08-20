"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateAnalysis } from "@/lib/analysis";

export type FormState = { error?: string };

/**
 * A date input hands back "YYYY-MM-DD". Passing that to `new Date` parses it as
 * UTC midnight, which renders as the previous day for anyone west of UTC — so
 * build the date in local time instead.
 */
function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createEntry(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const decision = String(formData.get("decision") ?? "").trim();
  const reasoning = String(formData.get("reasoning") ?? "").trim();
  const rawConfidence = Number(formData.get("confidence"));
  const category = String(formData.get("category") ?? "").trim() || null;
  const consultedOthers = formData.get("consultedOthers") === "on";
  const resolutionDate = parseLocalDate(String(formData.get("resolutionDate") ?? ""));

  if (!decision) return { error: "Write down what you're deciding." };
  if (!reasoning) return { error: "Write down why — the reasoning is what gets analysed." };
  if (Number.isNaN(rawConfidence)) return { error: "Pick a confidence level." };
  if (!resolutionDate) return { error: "Pick a date you'll know the outcome by." };

  await prisma.entry.create({
    data: {
      decision,
      reasoning,
      confidence: Math.min(100, Math.max(0, Math.round(rawConfidence))),
      category,
      consultedOthers,
      resolutionDate,
      status: "open",
    },
  });

  revalidatePath("/journal");
  revalidatePath("/");
  redirect("/journal");
}

export async function resolveEntry(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  const resolutionNote = String(formData.get("resolutionNote") ?? "").trim() || null;

  if (!id) return { error: "Missing entry." };
  if (outcome !== "correct" && outcome !== "incorrect") {
    return { error: "Pick whether it turned out right or wrong." };
  }

  const existing = await prisma.entry.findUnique({ where: { id } });
  if (!existing) return { error: "That entry no longer exists." };
  if (existing.status === "resolved") {
    return { error: "That one is already resolved." };
  }

  await prisma.entry.update({
    where: { id },
    data: { status: "resolved", outcome, resolutionNote },
  });

  revalidatePath("/journal");
  revalidatePath("/");
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
