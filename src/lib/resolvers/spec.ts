import { z } from "zod";

/**
 * A preregistered criterion, made executable.
 *
 * Phase one made you write down in advance what would count as being wrong.
 * That closed most of the hole in self-grading, but not all of it: you still
 * decide, afterwards, whether the criterion was met. A resolver closes the rest
 * for the class of decisions whose outcome is a fact about the world rather
 * than a judgement — did the pull request merge, is the price above the line,
 * did the thing you said would happen happen.
 *
 * These decisions are a minority of any journal and always will be. The point
 * is not to adjudicate everything; it is to have a subset the machine grades,
 * so your self-graded accuracy has something honest to be compared against.
 */

export const ResolverSpecSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("github-pr-merged"),
    owner: z.string().min(1).max(100),
    repo: z.string().min(1).max(100),
    number: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal("github-issue-closed"),
    owner: z.string().min(1).max(100),
    repo: z.string().min(1).max(100),
    number: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal("http-json"),
    url: z.string().url(),
    /** Dotted path into the response, e.g. "data.amount". */
    path: z.string().min(1).max(200),
    op: z.enum(["gte", "lte", "eq", "contains"]),
    value: z.union([z.string(), z.number()]),
  }),
]);

export type ResolverSpec = z.infer<typeof ResolverSpecSchema>;

export type Observation =
  | {
      status: "correct" | "incorrect";
      /** What was actually seen, in words, so the grade can be argued with. */
      evidence: string;
      source: string;
      observedAt: Date;
    }
  | { status: "pending"; reason: string };

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * `http-json` hands a user-supplied URL to the server, which is a request
 * forgery waiting to happen. On a single-user local tool the blast radius is
 * your own machine — which is exactly the machine holding the journal, so the
 * guard is worth having anyway.
 */
const BLOCKED_HOSTS = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|\[?::1\]?)/i;
const BLOCKED_172 = /^172\.(1[6-9]|2\d|3[01])\./;

export function isSafeUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (BLOCKED_HOSTS.test(url.hostname)) return false;
  if (BLOCKED_172.test(url.hostname)) return false;
  return true;
}

/** Walks a dotted path, supporting numeric indices for arrays. */
export function pluck(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const index = Number(key);
      return Number.isInteger(index) ? current[index] : undefined;
    }
    if (typeof current === "object") {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, value);
}

export function describeResolver(spec: ResolverSpec): string {
  switch (spec.kind) {
    case "github-pr-merged":
      return `${spec.owner}/${spec.repo}#${spec.number} is merged`;
    case "github-issue-closed":
      return `${spec.owner}/${spec.repo}#${spec.number} is closed`;
    case "http-json": {
      const op = { gte: "at least", lte: "at most", eq: "exactly", contains: "contains" }[spec.op];
      return `${spec.path} at ${new URL(spec.url).hostname} is ${op} ${spec.value}`;
    }
  }
}
