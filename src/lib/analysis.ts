import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  accuracyFor,
  averageConfidence,
  calibrationCurve,
  splitByConsultation,
  type ResolvedEntry,
} from "@/lib/calibration";

const InsightSchema = z.object({
  headline: z.string(),
  evidence: z.string(),
  tryInstead: z.string(),
});

const InsightsSchema = z.object({ insights: z.array(InsightSchema) });

export type Insight = z.infer<typeof InsightSchema>;

// Mirrors InsightsSchema for the model. Property ordering is declared explicitly
// because Gemini follows it when generating, and a mismatch against the order
// described in the prompt tends to produce malformed output.
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    insights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          headline: {
            type: Type.STRING,
            description:
              "The specific finding, stated as a claim about this person's reasoning. One sentence.",
          },
          evidence: {
            type: Type.STRING,
            description:
              "The numbers and the quoted language from their own entries that support the headline. Two to three sentences.",
          },
          tryInstead: {
            type: Type.STRING,
            description: "One concrete change to make on the next decision of this kind. One sentence.",
          },
        },
        required: ["headline", "evidence", "tryInstead"],
        propertyOrdering: ["headline", "evidence", "tryInstead"],
      },
    },
  },
  required: ["insights"],
};

type EntryRow = ResolvedEntry & {
  decision: string;
  reasoning: string;
  resolutionNote: string | null;
};

const SYSTEM = `You analyze decision journals to find where someone's confidence systematically fails to match reality.

You are given every resolved entry: what they decided, the reasoning they wrote BEFORE knowing the outcome, how confident they said they were, and how it actually turned out. You are also given pre-computed accuracy statistics so you never have to count anything yourself — use those numbers, do not recompute them.

Your job is to find patterns the person could not have seen on their own. A useful finding connects a measurable calibration gap to something concrete and recurring in HOW they reasoned — the specific phrases they reach for, the situations they don't check their thinking, the category where certainty runs ahead of evidence.

What separates a real finding from a worthless one:

BAD: "You tend to be overconfident." — True of nearly everyone, tells them nothing, cites nothing.
BAD: "You were wrong about the marathon decision." — A single fact they already know. Not a pattern.
BAD: "Consider seeking more outside input." — Generic advice, not grounded in their data.

GOOD: "Your certainty is highest exactly where you skip outside input. On the 11 decisions you rated 85%+ and reasoned through alone, you were right 55% of the time; on the 8 you rated just as highly after talking them through, you were right 88%. Nine of the eleven solo entries contain some version of 'I've thought about this a lot' or 'I don't need to run this by anyone' — the phrase shows up as a substitute for checking, not evidence of having checked."

The difference: a GOOD finding names a measurable gap, quotes their actual language, and says something they would not have told themselves.

Rules:
- Every insight must cite at least one specific number from the supplied statistics AND quote at least one real fragment from their entries.
- Never invent a quote. Never estimate or recompute counts.
- If the data genuinely does not support a specific pattern, say so plainly in that insight rather than inventing one.
- Address them as "you". No preamble, no hedging, no therapy voice.
- Return exactly 3 insights, most striking first.`;

function buildUserPrompt(entries: EntryRow[]) {
  const { solo, consulted } = splitByConsultation(entries);
  const highConf = entries.filter((e) => e.confidence >= 85);
  const highSolo = highConf.filter((e) => !e.consultedOthers);
  const highConsulted = highConf.filter((e) => e.consultedOthers);

  const categories = [...new Set(entries.map((e) => e.category).filter(Boolean))] as string[];
  const byCategory = categories.map((c) => {
    const rows = entries.filter((e) => e.category === c);
    return `  ${c}: ${rows.length} decisions · said ${averageConfidence(rows)}% · right ${accuracyFor(rows)}%`;
  });

  const buckets = calibrationCurve(entries).map(
    (b) => `  ${b.label}: ${b.count} decisions · said ${b.statedConfidence}% · right ${b.actualAccuracy}%`
  );

  const stats = [
    `Overall: ${entries.length} resolved · said ${averageConfidence(entries)}% · right ${accuracyFor(entries)}%`,
    ``,
    `By confidence bucket:`,
    ...buckets,
    ``,
    `Reasoned alone: ${solo.length} decisions · said ${averageConfidence(solo)}% · right ${accuracyFor(solo)}%`,
    `Talked it through: ${consulted.length} decisions · said ${averageConfidence(consulted)}% · right ${accuracyFor(consulted)}%`,
    ``,
    `High confidence (85%+) and reasoned alone: ${highSolo.length} decisions · said ${averageConfidence(highSolo)}% · right ${accuracyFor(highSolo)}%`,
    `High confidence (85%+) and talked it through: ${highConsulted.length} decisions · said ${averageConfidence(highConsulted)}% · right ${accuracyFor(highConsulted)}%`,
    ``,
    `By category:`,
    ...byCategory,
  ].join("\n");

  const entryLines = entries
    .map((e, i) =>
      [
        `[${i + 1}] ${e.decision}`,
        `    confidence: ${e.confidence}% · ${e.consultedOthers ? "talked it through" : "reasoned alone"} · ${e.category ?? "uncategorized"}`,
        `    reasoning: ${e.reasoning}`,
        `    outcome: ${e.outcome === "correct" ? "RIGHT" : "WRONG"}${e.resolutionNote ? ` — ${e.resolutionNote}` : ""}`,
      ].join("\n")
    )
    .join("\n\n");

  return `PRE-COMPUTED STATISTICS (use these exact numbers):\n${stats}\n\nENTRIES:\n\n${entryLines}`;
}

export async function generateAnalysis(): Promise<Insight[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");

  const entries = (await prisma.entry.findMany({
    where: { status: "resolved" },
    orderBy: { createdAt: "asc" },
  })) as EntryRow[];

  if (entries.length < 5) {
    throw new Error("Need at least 5 resolved decisions before the pattern analysis means anything.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: process.env.DOXA_MODEL ?? "gemini-2.5-flash",
    contents: buildUserPrompt(entries),
    config: {
      systemInstruction: SYSTEM,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error("The model returned an empty response.");

  const parsed = InsightsSchema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new Error("The model's response did not match the expected shape.");
  }

  await prisma.analysis.create({
    data: {
      insights: JSON.stringify(parsed.data.insights),
      entriesAnalyzed: entries.length,
    },
  });

  return parsed.data.insights;
}

export async function getLatestAnalysis() {
  const latest = await prisma.analysis.findFirst({ orderBy: { createdAt: "desc" } });
  if (!latest) return null;
  return {
    insights: JSON.parse(latest.insights) as Insight[],
    entriesAnalyzed: latest.entriesAnalyzed,
    createdAt: latest.createdAt,
  };
}
