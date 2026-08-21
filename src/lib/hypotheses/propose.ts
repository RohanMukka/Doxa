import { z } from "zod";
import { FEATURE_LABELS, FEATURE_NAMES } from "./features";
import { PredicateSchema } from "./predicate";
import type { Candidate } from "./enumerate";
import type { Subject } from "./predicate";

/**
 * Asking the model for hypotheses rather than conclusions.
 *
 * The prompt is built from the training window only. A model shown the whole
 * journal would be proposing claims about decisions it has already read the
 * outcomes of, and every one would "hold" — the held-out decisions are the only
 * thing standing between a pattern and a coincidence, and showing them to the
 * proposer spends them.
 */

const ProposalSchema = z.object({
  headline: z.string(),
  evidence: z.string(),
  tryInstead: z.string(),
  predicate: PredicateSchema,
});

export const ProposalsSchema = z.object({
  hypotheses: z.array(ProposalSchema),
});

export type Proposal = z.infer<typeof ProposalSchema>;

/** Mirrors ProposalsSchema for the model, in neutral JSON Schema. */
export const PROPOSAL_RESPONSE_SCHEMA = {
  type: "object" as const,
  properties: {
    hypotheses: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          headline: {
            type: "string" as const,
            description:
              "The claim about this person's reasoning, as one sentence they could agree or disagree with.",
          },
          evidence: {
            type: "string" as const,
            description:
              "The numbers and the quoted language from their entries that suggested it. Two to three sentences.",
          },
          tryInstead: {
            type: "string" as const,
            description: "One concrete change to make on the next decision of this kind.",
          },
          predicate: {
            type: "string" as const,
            description:
              "A JSON object selecting the subgroup this claim is about, using only the documented vocabulary. Returned as a JSON string.",
          },
        },
        required: ["headline", "evidence", "tryInstead", "predicate"],
      },
    },
  },
  required: ["hypotheses"],
};

export const PROPOSAL_SYSTEM = `You read decision journals and propose testable claims about how someone's confidence fails them.

You are shown only the EARLIER part of their journal. Later decisions are held back, and every claim you make will be scored against those — decisions you have not seen. A claim that merely describes what is in front of you will fail. Propose things you expect to keep being true.

Each hypothesis has two parts, and both matter:

1. A claim in words: one sentence about how this person reasons, specific enough that they could disagree with it.
2. A PREDICATE: a machine-checkable filter selecting the subgroup the claim is about. This is what makes the claim testable rather than merely agreeable.

PREDICATE VOCABULARY — use only these forms:

  {"field":"confidence","op":"gte"|"lte","value":<0-100>}
  {"field":"consultedOthers","eq":true|false}
  {"field":"category","eq":"<category name>"}
  {"field":"reasoningContains","anyOf":["phrase","phrase"]}
  {"field":"feature","name":"<feature>","op":"gte"|"lte","value":<number>}
  {"all":[ ... ]}   {"any":[ ... ]}   {"not": ... }

Available features, all rates per 100 words except wordCount:
FEATURES

The predicate must be returned as a JSON string, e.g.:
  "{\\"all\\":[{\\"field\\":\\"confidence\\",\\"op\\":\\"gte\\",\\"value\\":85},{\\"field\\":\\"consultedOthers\\",\\"eq\\":false}]}"

What makes a good hypothesis:

BAD: "You tend to be overconfident." — true of nearly everyone, and the predicate would have to be "everything".
BAD: A predicate matching two entries. It cannot be tested and will be discarded.
BAD: A claim that only restates the predicate. "You are worse above 85%" with predicate confidence>=85 says nothing beyond the filter.

GOOD: A claim naming something about HOW they wrote, tied to a subgroup big enough to test, that would still be true of decisions you have not seen. The claim should explain *why* the subgroup is different, and the predicate should capture the subgroup without simply being the claim.

Rules:
- Each predicate should select somewhere between a quarter and three quarters of the entries. Too narrow cannot be tested; too broad says nothing.
- Quote real fragments in the evidence. Never invent a quote.
- Use the supplied statistics; never recompute or estimate counts.
- Address them as "you". No preamble.
- Return exactly 3 hypotheses, most promising first.`.replace(
  "FEATURES",
  FEATURE_NAMES.map((n) => `  ${n} — ${FEATURE_LABELS[n]}`).join("\n")
);

export function buildProposalPrompt(training: Subject[], statistics: string): string {
  const entries = training
    .map((e, i) =>
      [
        `[${i + 1}] confidence ${e.confidence}% · ${e.consultedOthers ? "talked it through" : "reasoned alone"} · ${e.category ?? "uncategorised"} · ${e.outcome === "correct" ? "RIGHT" : "WRONG"}`,
        `    ${e.reasoning}`,
      ].join("\n")
    )
    .join("\n\n");

  return `THESE ARE THE EARLIER DECISIONS ONLY. Later ones are held back to test what you propose.

PRE-COMPUTED STATISTICS (use these exact numbers):
${statistics}

ENTRIES:

${entries}`;
}

/**
 * Turns model output into candidates, dropping anything whose predicate doesn't
 * parse. A malformed filter is not a claim that can be checked, and quietly
 * repairing one would mean testing something the model didn't say.
 */
export function toCandidates(proposals: Proposal[]): {
  candidates: Candidate[];
  discarded: number;
} {
  const candidates: Candidate[] = [];
  let discarded = 0;

  for (const p of proposals) {
    const parsed = PredicateSchema.safeParse(p.predicate);
    if (!parsed.success) {
      discarded++;
      continue;
    }
    candidates.push({
      predicate: parsed.data,
      source: "model",
      headline: p.headline,
      evidence: p.evidence,
      tryInstead: p.tryInstead,
    });
  }

  return { candidates, discarded };
}

/** The model returns the predicate as a JSON string; parse before validating. */
export function parseProposals(raw: unknown): Proposal[] {
  const outer = z
    .object({
      hypotheses: z.array(
        z.object({
          headline: z.string(),
          evidence: z.string(),
          tryInstead: z.string(),
          predicate: z.union([z.string(), z.record(z.string(), z.unknown())]),
        })
      ),
    })
    .safeParse(raw);

  if (!outer.success) throw new Error("The model's response did not match the expected shape.");

  return outer.data.hypotheses.map((h) => ({
    ...h,
    predicate:
      typeof h.predicate === "string"
        ? safeJson(h.predicate)
        : (h.predicate as Proposal["predicate"]),
  })) as Proposal[];
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Returned as-is so predicate validation rejects it and the row is
    // discarded with a count, rather than throwing away the whole batch.
    return { field: "malformed" };
  }
}
