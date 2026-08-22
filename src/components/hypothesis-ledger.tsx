import type { Ledger, LedgerRow } from "@/lib/hypotheses/run";

/**
 * Every claim that was tested, including — especially — the ones that didn't
 * survive.
 *
 * Showing the failures is the point rather than a concession. A panel that
 * quietly kept only its winners would be doing precisely what this product
 * exists to catch a person doing, and the number of claims that had to be
 * discarded is the context that makes a surviving one worth anything.
 */

const STATUS: Record<string, { label: string; background: string; color: string }> = {
  held: { label: "Held out-of-sample", background: "var(--good-wash)", color: "var(--good)" },
  failed: { label: "Failed to generalise", background: "var(--critical-wash)", color: "var(--critical)" },
  untestable: { label: "Not testable yet", background: "var(--accent-soft)", color: "var(--accent)" },
};

function Status({ outcome }: { outcome: string }) {
  const s = STATUS[outcome] ?? STATUS.untestable;
  return (
    <span
      className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
      style={{ background: s.background, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function Row({ row }: { row: LedgerRow }) {
  const dimmed = row.outcome !== "held";

  return (
    <li className="border-t border-hairline pt-5 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-4">
        <p
          className={`text-[15px] leading-snug ${dimmed ? "text-ink-secondary" : "font-medium"}`}
        >
          {row.headline}
        </p>
        <Status outcome={row.outcome} />
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
        Tested as: <span className="text-ink-secondary">{row.predicateText}</span>
        {row.source === "model" && <span className="ml-2">· proposed by the model</span>}
      </p>

      {row.outcome === "untestable" ? (
        <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">{row.reason}</p>
      ) : (
        <p className="mt-2 text-[12px] leading-relaxed text-ink-muted tabular-nums">
          {row.lift >= 0 ? "+" : ""}
          {Math.round(row.lift)} pts more overconfident inside than outside, across{" "}
          {row.nInside} and {row.nOutside} held-out decisions · p&nbsp;=&nbsp;
          {row.p.toFixed(2)} · q&nbsp;=&nbsp;{row.q.toFixed(2)}
        </p>
      )}

      {row.outcome === "held" && row.tryInstead && (
        <p
          className="mt-3 border-l-2 pl-4 text-[13px] leading-relaxed"
          style={{ borderColor: "var(--accent)" }}
        >
          <span className="eyebrow block">Try instead</span>
          <span className="mt-1 block">{row.tryInstead}</span>
        </p>
      )}
    </li>
  );
}

export function HypothesisLedger({ ledger }: { ledger: Ledger }) {
  return (
    <div>
      <p className="text-[14px] leading-relaxed text-ink-secondary">
        {ledger.rows.length} claims about how you reason were generated from your first{" "}
        <span className="tabular-nums text-ink">{ledger.trainingN}</span> decisions, then
        tested against the{" "}
        <span className="tabular-nums text-ink">{ledger.holdoutN}</span> most recent — which
        they were never shown.{" "}
        {ledger.rows.some((r) => r.source === "model") ? (
          <>The model proposed some of these; the rest were swept mechanically from your journal&apos;s own shape. Both are judged at the same bar. </>
        ) : (
          <>They were swept mechanically from your journal&apos;s own shape — running the analysis adds the model&apos;s own proposals, judged at the same bar. </>
        )}
        {ledger.held === 0 ? (
          <>
            <span className="font-medium text-ink">None of them survived.</span> That is the
            honest outcome at this size, not a broken feature: with {ledger.holdoutN} held-out
            decisions, only a very large effect could clear the bar.
          </>
        ) : (
          <>
            <span className="font-medium text-ink">
              {ledger.held} survived; {ledger.failed} did not.
            </span>{" "}
            The ones that failed are kept below, because how many claims had to be discarded
            is what makes a surviving one worth anything.
          </>
        )}
      </p>

      <ul className="mt-7 space-y-5">
        {ledger.rows.map((row) => (
          <Row key={row.id} row={row} />
        ))}
      </ul>

      <p className="mt-7 border-t border-hairline pt-4 text-[12px] leading-relaxed text-ink-muted">
        Each claim is scored by how much more overconfident you are inside it than outside,
        on held-out decisions only. p is a permutation test on that gap; q is the same after
        Benjamini-Hochberg across all {ledger.rows.length} — because testing enough claims at
        p&nbsp;&lt;&nbsp;0.05 turns one up by luck, and it would be exactly the one shown as
        a finding.
      </p>
    </div>
  );
}
