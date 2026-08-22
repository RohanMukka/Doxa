import { prisma } from "@/lib/prisma";
import { append } from "@/lib/journal/log";
import { check } from "./check";
import { ResolverSpecSchema, describeResolver, type Fetcher } from "./spec";

/**
 * Goes and checks every criterion whose deadline has passed.
 *
 * Deliberately a separate command rather than something the dashboard triggers
 * on render. Grading a decision is a write to an append-only log, and writes
 * that happen because somebody loaded a page are writes nobody chose to make.
 */

export type ResolveOutcome = {
  entryId: string;
  decision: string;
  criterion: string;
  status: "correct" | "incorrect" | "pending" | "unreadable";
  detail: string;
};

export type ResolveReport = {
  due: number;
  settled: number;
  stillPending: number;
  unreadable: number;
  results: ResolveOutcome[];
};

export async function resolveDue(
  now = new Date(),
  fetcher: Fetcher = fetch
): Promise<ResolveReport> {
  const candidates = await prisma.entry.findMany({
    where: { status: "open", resolver: { not: null }, resolutionDate: { lte: now } },
    orderBy: { resolutionDate: "asc" },
  });

  const results: ResolveOutcome[] = [];

  for (const entry of candidates) {
    const parsed = ResolverSpecSchema.safeParse(JSON.parse(entry.resolver as string));

    if (!parsed.success) {
      // Validation happens at creation, so reaching this means the row was
      // written around the app or the vocabulary changed under it. Either way
      // it is reported rather than guessed at.
      results.push({
        entryId: entry.id,
        decision: entry.decision,
        criterion: "unreadable",
        status: "unreadable",
        detail: "The stored check isn't one this version knows how to run.",
      });
      continue;
    }

    const spec = parsed.data;
    const observation = await check(spec, fetcher);
    const criterion = describeResolver(spec);

    if (observation.status === "pending") {
      results.push({
        entryId: entry.id,
        decision: entry.decision,
        criterion,
        status: "pending",
        detail: observation.reason,
      });
      continue;
    }

    await append([
      {
        type: "OutcomeRecorded",
        entryId: entry.id,
        payload: {
          outcome: observation.status,
          resolutionNote: `${criterion}. ${observation.evidence}`,
          adjudication: "external",
          evidence: observation.evidence,
          evidenceSource: observation.source,
        },
      },
    ]);

    results.push({
      entryId: entry.id,
      decision: entry.decision,
      criterion,
      status: observation.status,
      detail: observation.evidence,
    });
  }

  const count = (s: ResolveOutcome["status"]) => results.filter((r) => r.status === s).length;

  return {
    due: candidates.length,
    settled: count("correct") + count("incorrect"),
    stillPending: count("pending"),
    unreadable: count("unreadable"),
    results,
  };
}
