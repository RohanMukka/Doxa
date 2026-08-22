import type { ExperimentResult } from "@/lib/experiment";

/**
 * The app's own intervention, on trial.
 *
 * A tool that changes your decisions and never checks whether the change helps
 * is asking you to take on faith exactly the sort of claim it exists to stop
 * you taking on faith. So this reports the answer, including when the answer is
 * "not yet" and including when it is "no".
 */

function ArmRow({
  label,
  n,
  stated,
  actual,
  gap,
}: {
  label: string;
  n: number;
  stated: number | null;
  actual: number | null;
  gap: number | null;
}) {
  return (
    <tr className="border-t border-hairline">
      <td className="py-1.5">{label}</td>
      <td className="py-1.5 text-right">{n}</td>
      <td className="py-1.5 text-right">{stated === null ? "—" : `${stated}%`}</td>
      <td className="py-1.5 text-right">{actual === null ? "—" : `${actual}%`}</td>
      <td className="py-1.5 text-right font-medium">
        {gap === null ? "—" : `${gap > 0 ? "+" : ""}${gap}`}
      </td>
    </tr>
  );
}

export function ExperimentCard({ result }: { result: ExperimentResult }) {
  const { asked, notAsked, difference, p, comparable, threshold } = result;
  const total = asked.n + notAsked.n;
  const helped = difference !== null && difference < 0;
  const convincing = p !== null && p < 0.05;

  return (
    <div>
      <p className="text-[14px] leading-relaxed text-ink-secondary">
        {total === 0 ? (
          <>
            <span className="font-medium text-ink">The trial hasn&rsquo;t started.</span> Once
            you log decisions at {threshold}% or above, the gate will fire on a random half
            of them and this will compare the two groups. Every entry above predates the
            experiment, so none of them counts towards it — folding them in would put a
            thumb on whichever side they landed.
          </>
        ) : !comparable ? (
          <>
            <span className="font-medium text-ink">Too early to say.</span>{" "}
            <span className="tabular-nums">{asked.n}</span> decisions were asked for the
            disconfirming case and <span className="tabular-nums">{notAsked.n}</span>{" "}
            weren&rsquo;t. Both sides need more before a difference means anything.
          </>
        ) : convincing ? (
          <>
            Being asked to argue the other side{" "}
            <span className="font-medium text-ink">
              {helped ? "narrowed" : "widened"} the gap by{" "}
              <span className="tabular-nums">{Math.abs(difference!)} points</span>
            </span>{" "}
            on decisions above {threshold}%.
          </>
        ) : (
          <>
            <span className="font-medium text-ink">No detectable effect yet.</span> The two
            groups differ by{" "}
            <span className="tabular-nums">{Math.abs(difference ?? 0)} points</span>, which
            shuffling who got asked reproduces often enough that it isn&rsquo;t evidence
            either way.
          </>
        )}
      </p>

      {total > 0 && (
        <table className="mt-5 w-full text-[12px] tabular-nums">
          <caption className="sr-only">
            Calibration on high-confidence decisions, by whether the premortem was asked
          </caption>
          <thead className="text-ink-muted">
            <tr className="text-left">
              <th scope="col" className="font-normal">Group</th>
              <th scope="col" className="text-right font-normal">n</th>
              <th scope="col" className="text-right font-normal">Said</th>
              <th scope="col" className="text-right font-normal">Right</th>
              <th scope="col" className="text-right font-normal">Gap</th>
            </tr>
          </thead>
          <tbody>
            <ArmRow label="Asked to argue the other side" {...asked} />
            <ArmRow label="Not asked" {...notAsked} />
          </tbody>
        </table>
      )}

      <p className="mt-5 border-t border-hairline pt-4 text-[12px] leading-relaxed text-ink-muted">
        The gate fires on a random half of decisions at {threshold}% or above. Turning it on
        for everything and comparing against last year would be confounded with everything
        else that changed about you meanwhile — not least that you have been staring at a
        calibration dashboard the whole time. Randomising costs half the interventions and
        buys the only version of this question that has an answer.
        {p !== null && (
          <>
            {" "}
            Permutation test over 5,000 shuffles, p&nbsp;=&nbsp;
            <span className="tabular-nums">{p.toFixed(2)}</span>.
          </>
        )}
      </p>
    </div>
  );
}
