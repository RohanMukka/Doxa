import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { prisma } from "@/lib/prisma";
import {
  accuracyFor,
  averageConfidence,
  calibrationCurve,
  splitByConsultation,
  type ResolvedEntry,
} from "@/lib/calibration";

const InsightSchema = z.object({
  headline: z
    .string()
    .describe(
      "The specific finding, stated as a claim about this person's reasoning. One sentence."
    ),
  evidence: z
    .string()
    .describe(
      "The numbers and the quoted language from their own entries that support the headline. Two to three sentences."
    ),
  tryInstead: z
    .string()
    .describe("One concrete change to make on the next decision of this kind. One sentence."),
});

const InsightsSchema = z.object({
  insights: z.array(InsightSchema),
});

export type Insight = z.infer<typeof InsightSchema>;

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
- Quote real fragments from their entries. Never invent a quote.
- Use the supplied statistics verbatim. Never estimate or recompute counts.
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
    .map((e, i) => {
      return [
        `[${i + 1}] ${e.decision}`,
        `    confidence: ${e.confidence}% · ${e.consultedOthers ? "talked it through" : "reasoned alone"} · ${e.category ?? "uncategorized"}`,
        `    reasoning: ${e.reasoning}`,
        `    outcome: ${e.outcome === "correct" ? "RIGHT" : "WRONG"}${e.resolutionNote ? ` — ${e.resolutionNote}` : ""}`,
      ].join("\n");
    })
    .join("\n\n");

  return `PRE-COMPUTED STATISTICS (use these exact numbers):\n${stats}\n\nENTRIES:\n\n${entryLines}`;
}

export async function generateAnalysis(): Promise<Insight[]> {
  const entries = (await prisma.entry.findMany({
    where: { status: "resolved" },
    orderBy: { createdAt: "asc" },
  })) as EntryRow[];

  if (entries.length < 5) {
    throw new Error("Need at least 5 resolved decisions before the pattern analysis means anything.");
  }

  const client = new Anthropic();

  const response = await client.messages.parse({
    // Opus is the default because finding a non-obvious pattern in the reasoning
    // text is the whole product. Override with DOXA_MODEL if credits are tight —
    // claude-haiku-4-5 costs roughly a fifth as much per run.
    model: process.env.DOXA_MODEL ?? "claude-opus-5",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: SYSTEM,
    messages: [{ role: "user", content: buildUserPrompt(entries) }],
    output_config: { format: zodOutputFormat(InsightsSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) throw new Error("Could not parse the analysis response.");

  await prisma.analysis.create({
    data: {
      insights: JSON.stringify(parsed.insights),
      entriesAnalyzed: entries.length,
    },
  });

  return parsed.insights;
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
