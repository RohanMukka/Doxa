import type { HindsightStats } from "@/lib/calibration";

/**
 * The measurement the README's opening paragraph has always claimed and never
 * shown: memory rewriting itself.
 *
 * Two different failures live here and the card keeps them apart. Misremembering
 * a number in any direction is a bad memory for numbers. Misremembering it
 * *towards whatever happened* is hindsight bias — and only the spread between
 * the outcome groups is evidence of that, which is why the spread, not the
 * headline drift, carries the significance test.
 */

function Drift({
  label,
  n,
  drift,
  scale,
  flattersWhenPositive,
}: {
  label: string;
  n: number;
  drift: number;
  scale: number;
  /**
   * Which direction is the self-serving one for this group. Remembering more
   * certainty after being right and less after being wrong are the same bias
   * wearing opposite signs, so the colour has to follow flattery rather than
   * direction — otherwise the card says one of them is the good kind.
   */
  flattersWhenPositive: boolean;
}) {
  const width = `${Math.min(50, (Math.abs(drift) / scale) * 50)}%`;
  const inflated = drift > 0;
  const flatters = drift !== 0 && inflated === flattersWhenPositive;

  return (
    <div>
      <div className="flex items-baseline justify-between text-[13px]">
        <span>{label}</span>
        <span className="tabular-nums text-ink-muted">
          {drift > 0 ? "+" : ""}
          {drift} pts · n={n}
        </span>
      </div>
      {/* Bars run out from a centre line, because the sign is the finding. */}
      <div className="relative mt-1.5 h-1.5 rounded-full" style={{ background: "var(--gridline)" }}>
        <div
          className="absolute top-0 h-1.5"
          style={{
            width,
            left: inflated ? "50%" : undefined,
            right: inflated ? undefined : "50%",
            background: flatters ? "var(--critical)" : "var(--accent)",
            borderRadius: inflated ? "0 999px 999px 0" : "999px 0 0 999px",
          }}
        />
        <div
          className="absolute left-1/2 top-[-3px] h-3 w-px"
          style={{ background: "var(--axis)" }}
        />
      </div>
    </div>
  );
}

export function HindsightCard({
  stats,
  significance,
  missingRecall,
}: {
  stats: HindsightStats;
  significance: { spread: number; p: number; n: number } | null;
  /** Resolved decisions with no usable recall, so the sample is stated honestly. */
  missingRecall: number;
}) {
  const scale = Math.max(
    5,
    Math.abs(stats.afterCorrect?.drift ?? 0),
    Math.abs(stats.afterIncorrect?.drift ?? 0)
  );
  const convincing = significance !== null && significance.p < 0.05;

  return (
    <div>
      <p className="text-[14px] leading-relaxed text-ink-secondary">
        Across <span className="tabular-nums text-ink">{stats.n}</span> decisions you
        missed your own figure by{" "}
        <span className="font-medium tabular-nums text-ink">
          {stats.meanAbsError} points
        </span>{" "}
        on average. Which direction you missed in is the part that matters.
      </p>

      <div className="mt-5 space-y-4">
        {stats.afterCorrect && (
          <Drift
            label="After it went your way"
            n={stats.afterCorrect.n}
            drift={stats.afterCorrect.drift}
            scale={scale}
            flattersWhenPositive
          />
        )}
        {stats.afterIncorrect && (
          <Drift
            label="After it didn't"
            n={stats.afterIncorrect.n}
            drift={stats.afterIncorrect.drift}
            scale={scale}
            flattersWhenPositive={false}
          />
        )}
      </div>

      {significance && (
        <p className="mt-5 border-t border-hairline pt-4 text-[13px] leading-relaxed text-ink-secondary">
          {convincing ? (
            <>
              Your memory bends{" "}
              <span className="font-medium tabular-nums text-ink">
                {Math.abs(significance.spread)} points
              </span>{" "}
              towards whatever happened — remembering more certainty after being
              right, less after being wrong.
            </>
          ) : (
            <>
              The two groups differ by{" "}
              <span className="font-medium tabular-nums text-ink">
                {Math.abs(significance.spread)} points
              </span>
              , in the direction hindsight bias would predict —{" "}
              <em>but shuffling which decisions went well produces a gap that big</em>{" "}
              often enough that this isn&rsquo;t yet a finding.
            </>
          )}{" "}
          <span className="text-ink-muted">
            Permutation test over 10,000 shuffles, p&nbsp;=&nbsp;
            <span className="tabular-nums">{significance.p.toFixed(2)}</span>.
          </span>
        </p>
      )}

      <table className="mt-5 w-full text-[12px] tabular-nums">
        <caption className="sr-only">
          Recalled confidence against stated confidence, split by outcome
        </caption>
        <thead className="text-ink-muted">
          <tr className="text-left">
            <th scope="col" className="font-normal">Group</th>
            <th scope="col" className="text-right font-normal">Drift</th>
            <th scope="col" className="text-right font-normal">n</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["After it went your way", stats.afterCorrect],
            ["After it didn't", stats.afterIncorrect],
          ].map(([label, group]) =>
            group ? (
              <tr key={label as string} className="border-t border-hairline">
                <td className="py-1">{label as string}</td>
                <td className="py-1 text-right">
                  {(group as { drift: number }).drift > 0 ? "+" : ""}
                  {(group as { drift: number }).drift}
                </td>
                <td className="py-1 text-right">{(group as { n: number }).n}</td>
              </tr>
            ) : null
          )}
        </tbody>
      </table>

      {missingRecall > 0 && (
        <p className="mt-4 text-[12px] leading-relaxed text-ink-muted">
          {missingRecall} resolved {missingRecall === 1 ? "decision has" : "decisions have"} no
          usable recall — either resolved before the question existed, or answered
          after the figure had been unsealed. Counting those would measure reading
          rather than memory.
        </p>
      )}
    </div>
  );
}
