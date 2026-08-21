import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { enumerateCandidates, type Candidate } from "./enumerate";
import { describe, type Subject } from "./predicate";
import { controlFalseDiscovery, testHypothesis, trainingSplit } from "./validate";

/**
 * Propose, test, correct, record — including the claims that didn't survive.
 *
 * The ordering is the whole design. Candidates are generated from the training
 * decisions alone; every one is scored on the held-back decisions; the batch
 * goes through false-discovery control together; and all of it is written down,
 * failures included. A ledger that only kept its winners would be doing exactly
 * what this product exists to catch someone doing.
 */

export type LedgerRow = {
  id: string;
  source: string;
  headline: string;
  evidence: string | null;
  tryInstead: string | null;
  predicateText: string;
  lift: number;
  nInside: number;
  nOutside: number;
  p: number;
  q: number;
  outcome: string;
  reason: string | null;
};

export type Ledger = {
  runId: string;
  createdAt: Date;
  trainingN: number;
  holdoutN: number;
  rows: LedgerRow[];
  held: number;
  failed: number;
  untestable: number;
};

/** Below this there is nothing to hold back, so there is nothing to test. */
export const MIN_ENTRIES = 16;

export async function runHypotheses(extra: Candidate[] = []): Promise<Ledger> {
  const entries = await prisma.entry.findMany({
    where: { status: "resolved" },
    orderBy: { createdAt: "asc" },
  });

  if (entries.length < MIN_ENTRIES) {
    throw new Error(
      `Testing a claim means holding decisions back from it. That needs at least ${MIN_ENTRIES} resolved; there are ${entries.length}.`
    );
  }

  const subjects: Subject[] = entries.map((e) => ({
    confidence: e.confidence,
    outcome: e.outcome,
    consultedOthers: e.consultedOthers,
    category: e.category,
    reasoning: e.reasoning,
  }));

  const { training, holdout } = trainingSplit(subjects);
  const candidates = [...enumerateCandidates(training), ...extra];

  const tested = candidates.map((c) => testHypothesis(c.predicate, holdout));
  const corrected = controlFalseDiscovery(tested);

  const runId = randomUUID();
  const createdAt = new Date();

  await prisma.hypothesis.createMany({
    data: candidates.map((c, i) => ({
      runId,
      source: c.source,
      headline: c.headline,
      evidence: c.evidence ?? null,
      tryInstead: c.tryInstead ?? null,
      predicate: JSON.stringify(c.predicate),
      predicateText: describe(c.predicate),
      lift: corrected[i].lift,
      nInside: corrected[i].nInside,
      nOutside: corrected[i].nOutside,
      p: corrected[i].p,
      q: corrected[i].q,
      outcome: corrected[i].outcome,
      reason: corrected[i].reason ?? null,
      trainingN: training.length,
      holdoutN: holdout.length,
      createdAt,
    })),
  });

  return summarise(runId, createdAt, training.length, holdout.length, candidates, corrected);
}

function summarise(
  runId: string,
  createdAt: Date,
  trainingN: number,
  holdoutN: number,
  candidates: Candidate[],
  results: ReturnType<typeof controlFalseDiscovery>
): Ledger {
  const rows: LedgerRow[] = candidates.map((c, i) => ({
    id: `${runId}-${i}`,
    source: c.source,
    headline: c.headline,
    evidence: c.evidence ?? null,
    tryInstead: c.tryInstead ?? null,
    predicateText: describe(c.predicate),
    ...results[i],
    reason: results[i].reason ?? null,
  }));
  return withCounts({ runId, createdAt, trainingN, holdoutN, rows });
}

function withCounts(base: Omit<Ledger, "held" | "failed" | "untestable">): Ledger {
  const count = (o: string) => base.rows.filter((r) => r.outcome === o).length;
  return {
    ...base,
    held: count("held"),
    failed: count("failed"),
    untestable: count("untestable"),
  };
}

/** The most recent batch, ordered so what survived reads first. */
export async function latestLedger(): Promise<Ledger | null> {
  const newest = await prisma.hypothesis.findFirst({ orderBy: { createdAt: "desc" } });
  if (!newest) return null;

  const rows = await prisma.hypothesis.findMany({
    where: { runId: newest.runId },
    orderBy: [{ outcome: "asc" }, { q: "asc" }],
  });

  const rank = { held: 0, failed: 1, untestable: 2 } as Record<string, number>;

  return withCounts({
    runId: newest.runId,
    createdAt: newest.createdAt,
    trainingN: newest.trainingN,
    holdoutN: newest.holdoutN,
    rows: rows
      .map((r) => ({
        id: r.id,
        source: r.source,
        headline: r.headline,
        evidence: r.evidence,
        tryInstead: r.tryInstead,
        predicateText: r.predicateText,
        lift: r.lift,
        nInside: r.nInside,
        nOutside: r.nOutside,
        p: r.p,
        q: r.q,
        outcome: r.outcome,
        reason: r.reason,
      }))
      .sort((a, b) => (rank[a.outcome] ?? 3) - (rank[b.outcome] ?? 3) || a.q - b.q),
  });
}
