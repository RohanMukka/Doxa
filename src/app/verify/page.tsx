import Link from "next/link";
import { readLog } from "@/lib/journal/log";
import { verifyJournal } from "@/lib/journal/verify";
import { ChainAuditor } from "@/components/chain-auditor";
import type { ClientStoredEvent } from "@/lib/journal/client-verify";

export const dynamic = "force-dynamic";

export default async function VerifyPage() {
  const [log, report] = await Promise.all([
    readLog(),
    verifyJournal(),
  ]);

  const clientLog: ClientStoredEvent[] = log.map((item) => ({
    seq: item.seq,
    prevHash: item.prevHash,
    hash: item.hash,
    event: {
      type: item.event.type,
      entryId: item.event.entryId,
      recordedAt: item.event.recordedAt.toISOString(),
      payload: item.event.payload as Record<string, unknown>,
    },
  }));

  return (
    <div className="rise space-y-10">
      <header className="border-b border-hairline pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Cryptographic Verification</p>
            <h1 className="display mt-4 text-[40px] sm:text-[48px]">
              The SHA-256 Audit Trail
            </h1>
            <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-ink-secondary">
              Doxa is an append-only, hash-chained journal. Every decision, confidence recall, and resolution is permanently locked to its predecessor. Any silent edit to a past record invalidates the entire projection chain.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-hairline bg-surface px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-hairline"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 font-mono text-[12px]">
          <div className="rounded-xl border border-hairline bg-surface/60 p-4">
            <div className="text-ink-muted text-[11px]">CHAIN BLOCKS</div>
            <div className="mt-1 text-[22px] font-semibold tabular-nums text-ink">{clientLog.length}</div>
          </div>
          <div className="rounded-xl border border-hairline bg-surface/60 p-4">
            <div className="text-ink-muted text-[11px]">INTEGRITY STATUS</div>
            <div className="mt-1 text-[20px] font-semibold text-emerald-400">
              {report.ok ? "SEALED" : "DRIFT"}
            </div>
          </div>
          <div className="col-span-2 rounded-xl border border-hairline bg-surface/60 p-4 overflow-hidden">
            <div className="text-ink-muted text-[11px]">TIP HASH (HEAD)</div>
            <div className="mt-1 truncate text-[13px] text-ink-secondary tabular-nums">
              {report.chain.head}
            </div>
          </div>
        </div>
      </header>

      <ChainAuditor
        initialLog={clientLog}
        initialReport={{
          ok: report.ok,
          events: report.chain.events,
          head: report.chain.head,
        }}
      />
    </div>
  );
}
