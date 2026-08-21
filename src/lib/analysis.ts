import { z } from "zod";
import {
  backendFor,
  chooseBackend,
  survey,
  type JsonSchema,
} from "@/lib/inference";
import {
  PROPOSAL_RESPONSE_SCHEMA,
  PROPOSAL_SYSTEM,
  buildProposalPrompt,
  parseProposals,
  toCandidates,
} from "@/lib/hypotheses/propose";
import { trainingSplit } from "@/lib/hypotheses/validate";
import type { Candidate } from "@/lib/hypotheses/enumerate";
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

// Exported so the parsing contract can be tested without an API key —
// malformed model output is the failure mode most likely to reach a user.
export const InsightsSchema = z.object({ insights: z.array(InsightSchema) });

export type Insight = z.infer<typeof InsightSchema>;

// Mirrors InsightsSchema for the model. Stated once, in plain JSON Schema, and
// translated per backend — Gemini wants upper-cased type names, Ollama takes it
// as-is and constrains decoding to it.
const RESPONSE_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    insights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          headline: {
            type: "string",
            description:
              "The specific finding, stated as a claim about this person's reasoning. One sentence.",
          },
          evidence: {
            type: "string",
            description:
              "The numbers and the quoted language from their own entries that support the headline. Two to three sentences.",
          },
          tryInstead: {
            type: "string",
            description:
              "One concrete change to make on the next decision of this kind. One sentence.",
          },
        },
        required: ["headline", "evidence", "tryInstead"],
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

/** The same figures, for the proposer, computed over the training window only. */
export function statisticsFor(entries: ResolvedEntry[]): string {
  const { solo, consulted } = splitByConsultation(entries);
  const buckets = calibrationCurve(entries).map(
    (b) => `  ${b.label}: ${b.count} decisions · said ${b.statedConfidence}% · right ${b.actualAccuracy}%`
  );
  return [
    `Overall: ${entries.length} resolved · said ${averageConfidence(entries)}% · right ${accuracyFor(entries)}%`,
    ``,
    `By confidence bucket:`,
    ...buckets,
    ``,
    `Reasoned alone: ${solo.length} · said ${averageConfidence(solo)}% · right ${accuracyFor(solo)}%`,
    `Talked it through: ${consulted.length} · said ${averageConfidence(consulted)}% · right ${accuracyFor(consulted)}%`,
  ].join("\n");
}

export type AnalysisRun = {
  insights: Insight[];
  backend: string;
  model: string;
  ranLocally: boolean;
};

/**
 * `cloudConsented` is the whole privacy story in one argument. Nothing in here
 * decides on your behalf that your journal may leave this machine: without a
 * yes for this run, the remote backend is unreachable, and the caller gets an
 * error explaining the choice rather than a quiet fallback.
 */
export async function generateAnalysis(cloudConsented = false): Promise<AnalysisRun> {
  const entries = (await prisma.entry.findMany({
    where: { status: "resolved" },
    orderBy: { createdAt: "asc" },
  })) as EntryRow[];

  if (entries.length < 5) {
    throw new Error("Need at least 5 resolved decisions before the pattern analysis means anything.");
  }

  const choice = chooseBackend(await survey(cloudConsented));
  if (!choice.ok) throw new Error(choice.error);

  const backend = backendFor(choice.backend);
  const text = await backend.generate({
    system: SYSTEM,
    prompt: buildUserPrompt(entries),
    schema: RESPONSE_SCHEMA,
  });

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    // Smaller local models are likelier to wrap JSON in prose, and a raw
    // SyntaxError reaching the user says nothing useful.
    throw new Error("The model's response wasn't valid JSON.");
  }

  const parsed = InsightsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("The model's response did not match the expected shape.");
  }

  await prisma.analysis.create({
    data: {
      insights: JSON.stringify(parsed.data.insights),
      entriesAnalyzed: entries.length,
      backend: backend.id,
      model: backend.model,
      ranLocally: backend.local,
    },
  });

  return {
    insights: parsed.data.insights,
    backend: backend.label,
    model: backend.model,
    ranLocally: backend.local,
  };
}

/**
 * Asks the model for testable hypotheses, shown only the training window.
 *
 * Separate from `generateAnalysis` because the two want different things: the
 * prose read describes the whole journal, while a hypothesis has to be proposed
 * in ignorance of the decisions it will be judged on. Showing the proposer the
 * held-out entries would spend the only thing standing between a pattern and a
 * coincidence.
 */
export async function proposeHypotheses(
  cloudConsented = false
): Promise<{ candidates: Candidate[]; discarded: number }> {
  const entries = (await prisma.entry.findMany({
    where: { status: "resolved" },
    orderBy: { createdAt: "asc" },
  })) as EntryRow[];

  const { training } = trainingSplit(entries);
  if (training.length < 10) {
    throw new Error("Not enough earlier decisions to propose anything from yet.");
  }

  const choice = chooseBackend(await survey(cloudConsented));
  if (!choice.ok) throw new Error(choice.error);
  const backend = backendFor(choice.backend);

  const text = await backend.generate({
    system: PROPOSAL_SYSTEM,
    prompt: buildProposalPrompt(training, statisticsFor(training)),
    schema: PROPOSAL_RESPONSE_SCHEMA as JsonSchema,
  });

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("The model's response wasn't valid JSON.");
  }

  return toCandidates(parseProposals(raw));
}

export async function getLatestAnalysis() {
  const latest = await prisma.analysis.findFirst({ orderBy: { createdAt: "desc" } });
  if (!latest) return null;

  // Anything resolved since the run means these insights no longer describe the
  // whole journal. Cheaper to say so than to silently show a stale read.
  const resolvedSince = await prisma.entry.count({
    where: { status: "resolved", resolvedAt: { gt: latest.createdAt } },
  });

  return {
    insights: JSON.parse(latest.insights) as Insight[],
    entriesAnalyzed: latest.entriesAnalyzed,
    createdAt: latest.createdAt,
    backend: latest.backend,
    model: latest.model,
    ranLocally: latest.ranLocally,
    resolvedSince,
    stale: resolvedSince > 0,
  };
}
