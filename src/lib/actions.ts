"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateAnalysis } from "@/lib/analysis";

export async function createEntry(formData: FormData) {
  const decision = String(formData.get("decision") ?? "").trim();
  const reasoning = String(formData.get("reasoning") ?? "").trim();
  const confidence = Number(formData.get("confidence"));
  const category = String(formData.get("category") ?? "").trim() || null;
  const consultedOthers = formData.get("consultedOthers") === "on";
  const resolutionDate = String(formData.get("resolutionDate") ?? "");

  if (!decision || !reasoning || !resolutionDate || Number.isNaN(confidence)) {
    throw new Error("Missing required fields.");
  }

  await prisma.entry.create({
    data: {
      decision,
      reasoning,
      confidence: Math.min(100, Math.max(0, Math.round(confidence))),
      category,
      consultedOthers,
      resolutionDate: new Date(resolutionDate),
      status: "open",
    },
  });

  revalidatePath("/journal");
  revalidatePath("/");
  redirect("/journal");
}

export async function resolveEntry(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  const resolutionNote = String(formData.get("resolutionNote") ?? "").trim() || null;

  if (!id || (outcome !== "correct" && outcome !== "incorrect")) {
    throw new Error("Missing required fields.");
  }

  await prisma.entry.update({
    where: { id },
    data: { status: "resolved", outcome, resolutionNote },
  });

  revalidatePath("/journal");
  revalidatePath("/");
}

export type AnalysisState = { error?: string };

export async function runAnalysis(): Promise<AnalysisState> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "Set ANTHROPIC_API_KEY in .env to run the analysis." };
  }

  try {
    await generateAnalysis();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Analysis failed." };
  }

  revalidatePath("/");
  return {};
}
