import { GENESIS_HASH, canonicalize } from "./events";

export type ClientJournalEvent = {
  type: string;
  entryId: string;
  recordedAt: string;
  payload: Record<string, unknown>;
};

export type ClientStoredEvent = {
  seq: number;
  prevHash: string;
  hash: string;
  event: ClientJournalEvent;
};

export type ClientChainBreak = {
  seq: number;
  reason: "hash-mismatch" | "link-mismatch";
  expected: string;
  found: string;
};

export type ClientVerificationResult = {
  ok: boolean;
  eventsCount: number;
  head: string;
  brokenSeq: number | null;
  breaks: ClientChainBreak[];
  invalidSeqs: Set<number>;
};

export async function sha256Hex(text: string): Promise<string> {
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function clientPreimage(prevHash: string, event: ClientJournalEvent): string {
  const isoDate = typeof event.recordedAt === "string" ? event.recordedAt : new Date(event.recordedAt).toISOString();
  return [
    prevHash,
    JSON.stringify(event.type),
    JSON.stringify(event.entryId),
    JSON.stringify(isoDate),
    canonicalize(event.payload),
  ].join("\n");
}

export async function clientEventHash(prevHash: string, event: ClientJournalEvent): Promise<string> {
  return sha256Hex(clientPreimage(prevHash, event));
}

export async function verifyClientChain(log: ClientStoredEvent[]): Promise<ClientVerificationResult> {
  const breaks: ClientChainBreak[] = [];
  const invalidSeqs = new Set<number>();
  let prevHash = GENESIS_HASH;
  let firstBrokenSeq: number | null = null;

  for (let i = 0; i < log.length; i++) {
    const stored = log[i];
    let isCurrentBroken = false;

    // Check link to previous hash
    if (stored.prevHash !== prevHash) {
      breaks.push({
        seq: stored.seq,
        reason: "link-mismatch",
        expected: prevHash,
        found: stored.prevHash,
      });
      isCurrentBroken = true;
    }

    // Check hash integrity against current payload
    const expected = await clientEventHash(stored.prevHash, stored.event);
    if (expected !== stored.hash) {
      breaks.push({
        seq: stored.seq,
        reason: "hash-mismatch",
        expected,
        found: stored.hash,
      });
      isCurrentBroken = true;
    }

    if (isCurrentBroken && firstBrokenSeq === null) {
      firstBrokenSeq = stored.seq;
    }

    if (firstBrokenSeq !== null && stored.seq >= firstBrokenSeq) {
      invalidSeqs.add(stored.seq);
    }

    prevHash = stored.hash;
  }

  return {
    ok: breaks.length === 0,
    eventsCount: log.length,
    head: prevHash,
    brokenSeq: firstBrokenSeq,
    breaks,
    invalidSeqs,
  };
}
