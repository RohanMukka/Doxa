"use client";

import { useState, useTransition, useEffect } from "react";
import {
  type ClientStoredEvent,
  type ClientVerificationResult,
  verifyClientChain,
} from "@/lib/journal/client-verify";

type Props = {
  initialLog: ClientStoredEvent[];
  initialReport: {
    ok: boolean;
    events: number;
    head: string;
  };
};

export function ChainAuditor({ initialLog, initialReport }: Props) {
  const [log, setLog] = useState<ClientStoredEvent[]>(initialLog);
  const [verification, setVerification] = useState<ClientVerificationResult>({
    ok: initialReport.ok,
    eventsCount: initialReport.events,
    head: initialReport.head,
    brokenSeq: null,
    breaks: [],
    invalidSeqs: new Set(),
  });
  const [tamperedScenario, setTamperedScenario] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedSeq, setExpandedSeq] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const runVerification = (currentLog: ClientStoredEvent[], scenario: string | null = null) => {
    startTransition(async () => {
      const result = await verifyClientChain(currentLog);
      setVerification(result);
      setTamperedScenario(scenario);
    });
  };

  const handleTamperConfidence = () => {
    // Find an early DecisionMade event
    const targetIdx = log.findIndex((e) => e.event.type === "DecisionMade");
    if (targetIdx === -1) return;

    const modified = JSON.parse(JSON.stringify(log)) as ClientStoredEvent[];
    const original = modified[targetIdx].event.payload.confidence;
    modified[targetIdx].event.payload.confidence = 55; // Tampered value
    setLog(modified);
    runVerification(
      modified,
      `Mutated Seq #${modified[targetIdx].seq} (DecisionMade): Stated confidence changed from ${original}% to 55% without updating hash signature.`
    );
  };

  const handleTamperOutcome = () => {
    // Find an OutcomeRecorded event
    const targetIdx = log.findIndex((e) => e.event.type === "OutcomeRecorded");
    if (targetIdx === -1) return;

    const modified = JSON.parse(JSON.stringify(log)) as ClientStoredEvent[];
    const original = modified[targetIdx].event.payload.outcome;
    modified[targetIdx].event.payload.outcome = original === "correct" ? "incorrect" : "correct";
    setLog(modified);
    runVerification(
      modified,
      `Mutated Seq #${modified[targetIdx].seq} (OutcomeRecorded): Historical outcome flipped from '${original}' to '${modified[targetIdx].event.payload.outcome}'.`
    );
  };

  const handleTamperReasoning = () => {
    const targetIdx = log.findIndex((e) => e.event.type === "DecisionMade");
    if (targetIdx === -1) return;

    const modified = JSON.parse(JSON.stringify(log)) as ClientStoredEvent[];
    modified[targetIdx].event.payload.reasoning =
      "I knew all along this would happen. (Retrospectively edited reasoning)";
    setLog(modified);
    runVerification(
      modified,
      `Mutated Seq #${modified[targetIdx].seq} (DecisionMade): Historical reasoning text altered in SQLite database.`
    );
  };

  const handleReset = () => {
    setLog(initialLog);
    runVerification(initialLog, null);
  };

  const filteredLog = log.filter((item) => {
    if (filterType !== "all" && item.event.type !== filterType) return false;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const payloadStr = JSON.stringify(item.event.payload).toLowerCase();
      return (
        item.seq.toString().includes(q) ||
        item.hash.toLowerCase().includes(q) ||
        item.event.type.toLowerCase().includes(q) ||
        payloadStr.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Top Banner Status */}
      <div
        className={`rounded-2xl border p-6 transition-all duration-300 ${
          verification.ok
            ? "border-emerald-500/20 bg-emerald-950/10 shadow-[0_0_30px_rgba(16,185,129,0.06)]"
            : "border-rose-500/40 bg-rose-950/20 shadow-[0_0_40px_rgba(244,63,94,0.15)] animate-pulse"
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl font-mono text-[18px] font-bold ${
                verification.ok
                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border border-rose-500/40 bg-rose-500/20 text-rose-400"
              }`}
            >
              {verification.ok ? "✓" : "⚠"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-medium tracking-tight text-ink">
                  {verification.ok
                    ? "Cryptographic Chain Verified"
                    : `Chain Integrity Broken at Seq #${verification.brokenSeq}`}
                </h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider ${
                    verification.ok
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  {verification.ok ? "100% Sealed" : "Tamper Detected"}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-ink-secondary">
                {verification.ok
                  ? `All ${verification.eventsCount} sequential events verified against SHA-256 digests.`
                  : `A silent database mutation has severed the hash projection starting at block #${verification.brokenSeq}.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!verification.ok && (
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full border border-white/20 bg-ink px-4 py-2 text-[12px] font-medium text-page transition-opacity hover:opacity-90"
              >
                Restore Chain Integrity
              </button>
            )}
          </div>
        </div>

        {tamperedScenario && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 font-mono text-[12px] text-rose-200">
            <div className="font-semibold text-rose-400">ALERT: MALICIOUS MUTATION PAYLOAD</div>
            <div className="mt-1 text-rose-300/90">{tamperedScenario}</div>
            {verification.breaks.length > 0 && (
              <div className="mt-2 text-[11px] text-rose-400/80">
                Found hash mismatch at Seq #{verification.breaks[0].seq}: Expected{" "}
                <code className="text-white">{verification.breaks[0].expected.slice(0, 16)}...</code> but found{" "}
                <code className="text-white">{verification.breaks[0].found.slice(0, 16)}...</code>.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Simulator Control Panel */}
      <div className="rounded-2xl border border-hairline bg-surface/70 p-6 backdrop-blur-md">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[14px] font-medium tracking-tight text-ink">
              Judge Interrogation & Tamper Simulator
            </h3>
            <p className="mt-0.5 text-[12px] text-ink-secondary">
              Simulate retroactive tampering in SQLite to prove the SHA-256 hash chain detects hindsight forgery.
            </p>
          </div>
          <span className="font-mono text-[11px] text-ink-muted">SHA-256 PREIMAGE REPLAY</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleTamperConfidence}
            className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2 text-left text-[12px] font-medium text-rose-300 transition-all hover:bg-rose-500/20 active:scale-95"
          >
            ⚡ Alter Confidence (Overconfidence Concealment)
          </button>
          <button
            type="button"
            onClick={handleTamperOutcome}
            className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2 text-left text-[12px] font-medium text-rose-300 transition-all hover:bg-rose-500/20 active:scale-95"
          >
            ⚡ Flip Outcome (Hindsight Fabrication)
          </button>
          <button
            type="button"
            onClick={handleTamperReasoning}
            className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2 text-left text-[12px] font-medium text-rose-300 transition-all hover:bg-rose-500/20 active:scale-95"
          >
            ⚡ Rewrite Reasoning Text
          </button>
          {tamperedScenario && (
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-hairline bg-surface-raised px-3.5 py-2 text-[12px] font-medium text-ink transition-all hover:bg-hairline active:scale-95"
            >
              🔄 Reset to Clean State
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {["all", "DecisionMade", "ConfidenceRecalled", "OutcomeRecorded"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                filterType === type
                  ? "border border-white/15 bg-surface-raised text-ink"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {type === "all" ? "All Blocks" : type}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Filter by hash, sequence, or keyword..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rounded-xl border border-hairline bg-surface/60 px-3.5 py-1.5 font-mono text-[12px] text-ink placeholder:text-ink-muted focus:border-hairline-strong focus:outline-none sm:w-72"
        />
      </div>

      {/* Chain Stream Visualizer */}
      <div className="space-y-4">
        {filteredLog.map((item) => {
          const isInvalid = verification.invalidSeqs.has(item.seq);
          const isOriginBreak = verification.brokenSeq === item.seq;
          const isExpanded = expandedSeq === item.seq;

          return (
            <div
              key={item.seq}
              className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 ${
                isInvalid
                  ? isOriginBreak
                    ? "border-rose-500 bg-rose-950/30 shadow-[0_0_25px_rgba(244,63,94,0.2)]"
                    : "border-rose-500/40 bg-rose-950/15"
                  : "border-hairline bg-surface/80 hover:border-hairline-strong"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-[12px] font-semibold tabular-nums ${
                      isInvalid
                        ? "bg-rose-500/20 text-rose-300"
                        : "bg-surface-raised text-ink-secondary"
                    }`}
                  >
                    #{item.seq}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium ${
                          item.event.type === "DecisionMade"
                            ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                            : item.event.type === "ConfidenceRecalled"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {item.event.type}
                      </span>

                      {isOriginBreak && (
                        <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          Break Origin
                        </span>
                      )}

                      {isInvalid && !isOriginBreak && (
                        <span className="rounded-full border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 text-[10px] font-medium text-rose-300">
                          Cascade Failure
                        </span>
                      )}

                      <span className="font-mono text-[11px] text-ink-muted">
                        {new Date(item.event.recordedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <p className="mt-2 text-[14px] font-medium text-ink">
                      {item.event.type === "DecisionMade" &&
                        String(item.event.payload.decision ?? "")}
                      {item.event.type === "ConfidenceRecalled" &&
                        `Recalled confidence: ${item.event.payload.recalledConfidence}% (${
                          item.event.payload.blind ? "Blind Recall" : "Unsealed"
                        })`}
                      {item.event.type === "OutcomeRecorded" &&
                        `Outcome resolved: ${item.event.payload.outcome?.toString().toUpperCase()} · Adjudication: ${
                          item.event.payload.adjudication
                        }`}
                    </p>

                    {item.event.type === "DecisionMade" && (
                      <div className="mt-2 flex items-center gap-3 text-[12px] text-ink-secondary">
                        <span className="font-mono tabular-nums text-sky-400">
                          {String(item.event.payload.confidence)}% Stated
                        </span>
                        <span>·</span>
                        <span>{item.event.payload.category?.toString() ?? "general"}</span>
                        <span>·</span>
                        <span>
                          {item.event.payload.consultedOthers ? "consulted" : "reasoned alone"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5 font-mono text-[11px]">
                  <div className="flex items-center gap-1.5 text-ink-muted">
                    <span>HASH:</span>
                    <span
                      className={`tabular-nums ${
                        isInvalid ? "text-rose-400 font-bold" : "text-ink"
                      }`}
                    >
                      {item.hash.slice(0, 16)}...{item.hash.slice(-8)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-ink-muted/70 text-[10px]">
                    <span>PREV:</span>
                    <span className="tabular-nums">
                      {item.prevHash.slice(0, 12)}...
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
                <button
                  type="button"
                  onClick={() => setExpandedSeq(isExpanded ? null : item.seq)}
                  className="text-[12px] font-mono text-ink-muted hover:text-ink"
                >
                  {isExpanded ? "▲ Hide Payload & Canonical JSON" : "▼ Inspect Block Payload"}
                </button>
                <span className="font-mono text-[11px] text-ink-muted">
                  Entry ID: {item.event.entryId.slice(0, 12)}
                </span>
              </div>

              {isExpanded && (
                <div className="mt-3 rounded-xl border border-hairline bg-surface-raised/90 p-4 font-mono text-[11px]">
                  <div className="text-ink-muted">CANONICAL EVENT PAYLOAD:</div>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-ink-secondary">
                    {JSON.stringify(item.event.payload, null, 2)}
                  </pre>
                  <div className="mt-3 border-t border-hairline pt-2 text-[10px] text-ink-muted">
                    FULL DIGEST: {item.hash}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
