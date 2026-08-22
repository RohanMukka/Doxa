import { prisma } from "@/lib/prisma";
import { backendFor, chooseBackend, survey, type JsonSchema } from "@/lib/inference";
import { fitRecalibration, recalibrate } from "@/lib/recalibration";

export type InterrogationResult = {
  challenge: string;
  historicalDecision: string | null;
  historicalReasoning: string | null;
  historicalOutcomeDate: string | null;
  historicalConfidence: number | null;
  citedPhrases: string[];
  suggestedCalibration: number;
  gapPoints: number;
};

const INTERROGATION_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    challenge: {
      type: "string",
      description:
        "A sharp, direct 2-3 sentence cross-examination confronting the user about their overconfidence, citing their exact words.",
    },
    citedPhrases: {
      type: "array",
      items: { type: "string" },
      description: "Exact substrings (2-6 words) quoted from the user's reasoning text.",
    },
  },
  required: ["challenge", "citedPhrases"],
};

export async function interrogateReasoning(input: {
  decision: string;
  reasoning: string;
  confidence: number;
  category?: string;
  consultedOthers?: boolean;
}): Promise<InterrogationResult> {
  const resolved = await prisma.entry.findMany({
    where: { status: "resolved" },
    orderBy: { createdAt: "desc" },
  });

  // Calculate Bayesian calibrated suggestion
  const fit = fitRecalibration(resolved);
  const honest = fit ? recalibrate(fit, input.confidence) : null;
  const suggestedCalibration = honest ? Math.round(honest.median) : Math.max(50, input.confidence - 20);
  const gapPoints = input.confidence - suggestedCalibration;

  // Find the most relevant historical failure (high confidence + incorrect outcome)
  const failedHighConf = resolved.filter(
    (e) => e.outcome === "incorrect" && e.confidence >= 80 && (!input.consultedOthers || !e.consultedOthers)
  );

  const referenceFailure = failedHighConf[0] ?? resolved.find((e) => e.outcome === "incorrect") ?? null;

  // Try LLM generation if backend is available
  try {
    const availability = await survey(false);
    const choice = chooseBackend(availability);
    if (choice.ok) {
      const backend = backendFor(choice.backend);
      const system = `You are an adversarial red-team interrogator in Doxa, a decision journal. Your job is to actively challenge users who submit confidence >= 85%. You must be direct, rigorous, and quote their exact words. Confront them with their past miscalibrated failures. No polite hedging.`;

      const prompt = `CURRENT PROPOSED DECISION:
Decision: "${input.decision}"
Reasoning: "${input.reasoning}"
Stated Confidence: ${input.confidence}%
Consulted Others: ${input.consultedOthers ? "Yes" : "No (reasoned alone)"}

HISTORICAL COMPARISON FROM USER'S JOURNAL:
${
  referenceFailure
    ? `Past Decision: "${referenceFailure.decision}"\nPast Stated Confidence: ${referenceFailure.confidence}%\nPast Reasoning: "${referenceFailure.reasoning}"\nPast Outcome: WRONG (Resolved ${referenceFailure.resolutionDate.toISOString().slice(0, 10)})`
    : "Multiple past high-confidence solo bets failed."
}
EMPIRICAL HIT RATE AT THIS CONFIDENCE: ${suggestedCalibration}% (Gap: -${gapPoints} points)

Generate a cross-examination that:
1. Quotes an exact phrase they used in their current reasoning.
2. Directly compares their current logic to their past failed decision.
3. Demands they explain what makes today's case distinct.`;

      const text = await backend.generate({
        system,
        prompt,
        schema: INTERROGATION_SCHEMA,
      });

      const parsed = JSON.parse(text) as { challenge: string; citedPhrases: string[] };
      return {
        challenge: parsed.challenge,
        historicalDecision: referenceFailure?.decision ?? null,
        historicalReasoning: referenceFailure?.reasoning ?? null,
        historicalOutcomeDate: referenceFailure?.resolutionDate.toISOString().slice(0, 10) ?? null,
        historicalConfidence: referenceFailure?.confidence ?? null,
        citedPhrases: parsed.citedPhrases ?? [],
        suggestedCalibration,
        gapPoints,
      };
    }
  } catch {
    // Fall through to deterministic heuristic generator
  }

  // Deterministic Fallback Generator
  const reasoningLower = input.reasoning.toLowerCase();
  const tellKeywords = [
    "i've thought about this",
    "i have thought about this",
    "i don't need to run this",
    "i don't need a second opinion",
    "obviously",
    "i'm confident",
    "i am confident",
    "i know my",
    "simple is right",
    "done this before",
  ];

  const matchedPhrases: string[] = [];
  for (const phrase of tellKeywords) {
    if (reasoningLower.includes(phrase)) {
      // Find original casing
      const startIdx = reasoningLower.indexOf(phrase);
      matchedPhrases.push(input.reasoning.slice(startIdx, startIdx + phrase.length));
    }
  }

  if (matchedPhrases.length === 0) {
    // Extract first 5 words of reasoning as quoted phrase
    const words = input.reasoning.trim().split(/\s+/).slice(0, 5).join(" ");
    if (words) matchedPhrases.push(words);
  }

  const phraseQuote = matchedPhrases[0] ? `"${matchedPhrases[0]}"` : "your intuition";
  const pastRef = referenceFailure
    ? `On ${referenceFailure.resolutionDate.toISOString().slice(0, 10)}, you rated "${referenceFailure.decision.slice(0, 45)}..." at ${referenceFailure.confidence}% confident and were wrong.`
    : `Across your previous high-confidence decisions, your actual empirical hit rate was only ${suggestedCalibration}%.`;

  const challenge = `You are staking ${input.confidence}% certainty on ${phraseQuote}. ${pastRef} What concrete evidence do you have right now that distinguishes this from your previous miscalibrated predictions?`;

  return {
    challenge,
    historicalDecision: referenceFailure?.decision ?? null,
    historicalReasoning: referenceFailure?.reasoning ?? null,
    historicalOutcomeDate: referenceFailure?.resolutionDate.toISOString().slice(0, 10) ?? null,
    historicalConfidence: referenceFailure?.confidence ?? null,
    citedPhrases: matchedPhrases,
    suggestedCalibration,
    gapPoints,
  };
}
