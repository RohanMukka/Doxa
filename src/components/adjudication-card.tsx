import type { AdjudicationSplit } from "@/lib/adjudication";

/**
 * The one statistic in Doxa that doesn't come from the person under suspicion.
 */

function SideRow({
  label,
  side,
}: {
  label: string;
  side: AdjudicationSplit["self"];
}) {
  return (
    <tr className="border-t border-hairline">
      <td className="py-1.5">{label}</td>
      <td className="py-1.5 text-right">{side.n}</td>
      <td className="py-1.5 text-right">{side.stated === null ? "—" : `${side.stated}%`}</td>
      <td className="py-1.5 text-right">{side.actual === null ? "—" : `${side.actual}%`}</td>
      <td className="py-1.5 text-right font-medium">
        {side.gap === null ? "—" : `${side.gap > 0 ? "+" : ""}${side.gap}`}
      </td>
    </tr>
  );
}

export function AdjudicationCard({ split }: { split: AdjudicationSplit }) {
  const { self, external, pendingChecks, difference, comparable } = split;
  const flatters = difference !== null && difference < 0;

  return (
    <div>
      <p className="text-[14px] leading-relaxed text-ink-secondary">
        {external.n === 0 ? (
          <>
            <span className="font-medium text-ink">
              Nothing has been graded by anything but you yet.
            </span>{" "}
            {pendingChecks > 0 ? (
              <>
                {pendingChecks}{" "}
                {pendingChecks === 1 ? "decision carries" : "decisions carry"} a check that
                hasn&rsquo;t come due. Run <code className="text-[12px]">npm run resolve</code>{" "}
                once past the date and the answer arrives from somewhere other than your own
                memory of what you meant.
              </>
            ) : (
              <>
                Attach a check to a decision whose outcome is a plain fact, and this will
                start comparing.
              </>
            )}
          </>
        ) : !comparable ? (
          <>
            <span className="font-medium text-ink">Too few to compare.</span>{" "}
            <span className="tabular-nums">{external.n}</span>{" "}
            {external.n === 1 ? "decision has" : "decisions have"} been settled by something
            other than you, against{" "}
            <span className="tabular-nums">{self.n}</span> you graded yourself.
          </>
        ) : flatters ? (
          <>
            <span className="font-medium text-ink">
              You are {Math.abs(difference!)} points kinder to yourself than the record is.
            </span>{" "}
            On the decisions you marked, your confidence ran {self.gap} points ahead of your
            accuracy. On the ones something else marked, {external.gap}.
          </>
        ) : (
          <>
            <span className="font-medium text-ink">Your grading holds up.</span> The
            decisions you marked yourself and the ones something else marked come out within{" "}
            {Math.abs(difference ?? 0)} points of each other.
          </>
        )}
      </p>

      {external.n > 0 && (
        <table className="mt-5 w-full text-[12px] tabular-nums">
          <caption className="sr-only">Calibration by who graded the outcome</caption>
          <thead className="text-ink-muted">
            <tr className="text-left">
              <th scope="col" className="font-normal">Graded by</th>
              <th scope="col" className="text-right font-normal">n</th>
              <th scope="col" className="text-right font-normal">Said</th>
              <th scope="col" className="text-right font-normal">Right</th>
              <th scope="col" className="text-right font-normal">Gap</th>
            </tr>
          </thead>
          <tbody>
            <SideRow label="You" side={self} />
            <SideRow label="Something else" side={external} />
          </tbody>
        </table>
      )}

      <p className="mt-5 border-t border-hairline pt-4 text-[12px] leading-relaxed text-ink-muted">
        The comparison isn&rsquo;t clean and never will be: the decisions a machine can
        settle are systematically plainer than the ones it can&rsquo;t — shorter-horizon,
        less tangled up in what you wanted to be true. A gap here is not proof that you
        flatter yourself. It is the first evidence about it that doesn&rsquo;t come from
        the person under suspicion.
      </p>
    </div>
  );
}
