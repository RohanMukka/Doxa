import { z } from "zod";
import { extractFeatures, FEATURE_NAMES, type Features } from "./features";

/**
 * A machine-checkable filter over entries.
 *
 * This is the difference between an insight and a hypothesis. "Your certainty
 * is highest exactly where you skip outside input" is prose — pleasant, and
 * unfalsifiable as written. Paired with a predicate it becomes a claim about a
 * specific subgroup of your journal, and a subgroup can be checked against
 * decisions the model never saw.
 *
 * Kept small on purpose. Every operator here is one a person could apply by
 * hand to their own entries, which is what makes a rejected hypothesis
 * explainable rather than merely reported.
 */

export type Subject = {
  confidence: number;
  outcome: string | null;
  consultedOthers: boolean;
  category: string | null;
  reasoning: string;
};

const Leaf = z.union([
  z.object({
    field: z.literal("confidence"),
    op: z.enum(["gte", "lte"]),
    value: z.number(),
  }),
  z.object({ field: z.literal("consultedOthers"), eq: z.boolean() }),
  z.object({ field: z.literal("category"), eq: z.string() }),
  z.object({
    field: z.literal("reasoningContains"),
    /** Matched case-insensitively against the reasoning text. */
    anyOf: z.array(z.string()).min(1).max(12),
  }),
  z.object({
    field: z.literal("feature"),
    name: z.enum(FEATURE_NAMES),
    op: z.enum(["gte", "lte"]),
    value: z.number(),
  }),
]);

export type PredicateLeaf = z.infer<typeof Leaf>;

export type Predicate =
  | PredicateLeaf
  | { all: Predicate[] }
  | { any: Predicate[] }
  | { not: Predicate };

// Zod can't infer a recursive union without the explicit annotation.
export const PredicateSchema: z.ZodType<Predicate> = z.lazy(() =>
  z.union([
    Leaf,
    z.object({ all: z.array(PredicateSchema).min(1).max(4) }),
    z.object({ any: z.array(PredicateSchema).min(1).max(4) }),
    z.object({ not: PredicateSchema }),
  ])
);

export function matches(
  predicate: Predicate,
  subject: Subject,
  features?: Features
): boolean {
  if ("all" in predicate) {
    return predicate.all.every((p) => matches(p, subject, features));
  }
  if ("any" in predicate) {
    return predicate.any.some((p) => matches(p, subject, features));
  }
  if ("not" in predicate) {
    return !matches(predicate.not, subject, features);
  }

  switch (predicate.field) {
    case "confidence":
      return predicate.op === "gte"
        ? subject.confidence >= predicate.value
        : subject.confidence <= predicate.value;

    case "consultedOthers":
      return subject.consultedOthers === predicate.eq;

    case "category":
      return (subject.category ?? "").toLowerCase() === predicate.eq.toLowerCase();

    case "reasoningContains": {
      const text = subject.reasoning.toLowerCase();
      return predicate.anyOf.some((phrase) => text.includes(phrase.toLowerCase()));
    }

    case "feature": {
      const value = (features ?? extractFeatures(subject.reasoning))[predicate.name];
      return predicate.op === "gte"
        ? value >= predicate.value
        : value <= predicate.value;
    }
  }
}

export function split<T extends Subject>(predicate: Predicate, subjects: T[]) {
  const inside: T[] = [];
  const outside: T[] = [];
  for (const s of subjects) {
    (matches(predicate, s) ? inside : outside).push(s);
  }
  return { inside, outside };
}

/**
 * Plain English for the ledger. A hypothesis the reader can't restate is one
 * they can't disagree with, and disagreeing is the point.
 */
export function describe(predicate: Predicate): string {
  if ("all" in predicate) return predicate.all.map(describe).join(" and ");
  if ("any" in predicate) return predicate.any.map(describe).join(" or ");
  if ("not" in predicate) return `not (${describe(predicate.not)})`;

  switch (predicate.field) {
    case "confidence":
      return `confidence ${predicate.op === "gte" ? "at or above" : "at or below"} ${predicate.value}%`;
    case "consultedOthers":
      return predicate.eq ? "talked through with someone" : "reasoned alone";
    case "category":
      return `in ${predicate.eq}`;
    case "reasoningContains":
      return `reasoning mentions ${predicate.anyOf.map((p) => `“${p}”`).join(" or ")}`;
    case "feature":
      return `${predicate.name} ${predicate.op === "gte" ? "at or above" : "at or below"} ${predicate.value}`;
  }
}
