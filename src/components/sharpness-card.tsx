import type { BrierParts, Verdict } from "@/lib/discrimination";

/**
 * Honest and useful are different things, and the dashboard used to conflate
 * them. Someone who says 60% to everything and is right 60% of the time is
 * perfectly calibrated and tells you nothing; someone badly scaled but
 * discriminating has a problem a dial fixes. These are the two axes.
 */

const VERDICTS: Record<Verdict, { headline: string; body: string }> = {
  "sharp-and-honest": {
    headline: "Your numbers mean what they say, and they separate outcomes.",
    body: "Both halves are working: the scale is right, and higher confidence really does track being right. This is the rare one.",
  },
  "informative-but-misscaled": {
    headline: "Your judgement is working. The numbers you put on it are not.",
    body: "You reliably feel more certain about the things that turn out right — that part is real. You just express it at the wrong scale, which is the failure a recalibration fixes rather than more deliberation.",
  },
  "honest-but-vague": {
    headline: "Well calibrated, and not yet telling you much.",
    body: "Your stated confidence is about right on average, but it doesn't separate the decisions that worked from the ones that didn't. Being honest and being informative are different achievements, and only the first is in evidence.",
  },
  "misscaled-and-unproven": {
    headline: "Your scale is off, and your confidence hasn't yet earned its keep.",
    body: "Stated confidence sits measurably away from what happened — that part is real and fixable. Whether it separates the decisions that worked from the ones that didn't is still inside what chance would produce, so the more useful half is unproven rather than absent.",
  },
  "no-data": {
    headline: "Not enough resolved decisions to say.",
    body: "Both of these need decisions on each side of the outcome to mean anything. Keep resolving.",
  },
};

function Part({
  label,
  value,
  scale,
  note,
  lowerIsBetter,
}: {
  label: string;
  value: number;
  scale: number;
  note: string;
  lowerIsBetter: boolean;
}) {
  const width = `${Math.min(100, (value / scale) * 100)}%`;
  return (
    <div>
      <div className="flex items-baseline justify-between text-[13px]">
        <span>{label}</span>
        <span className="tabular-nums text-ink-muted">{value.toFixed(3)}</span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full" style={{ background: "var(--gridline)" }}>
        <div
          className="h-1.5 rounded-full"
          style={{
            width,
            background: lowerIsBetter ? "var(--critical)" : "var(--accent)",
          }}
        />
      </div>
      <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">{note}</p>
    </div>
  );
}

export function SharpnessCard({
  parts,
  auc,
  verdict,
}: {
  parts: BrierParts;
  auc: { auc: number; low: number; high: number } | null;
  verdict: Verdict;
}) {
  const copy = VERDICTS[verdict];
  const scale = Math.max(0.05, parts.reliability, parts.resolution);

  return (
    <div>
      <p className="display text-[19px] leading-snug">{copy.headline}</p>
      <p className="mt-2.5 max-w-2xl text-[13px] leading-relaxed text-ink-secondary">
        {copy.body}
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Part
          label="Miscalibration"
          value={parts.reliability}
          scale={scale}
          lowerIsBetter
          note="How far your stated confidence sits from what happened. Lower is better; this is the part a recalibration can fix."
        />
        <Part
          label="Discrimination"
          value={parts.resolution}
          scale={scale}
          lowerIsBetter={false}
          note="How far your confidence moves away from your own average. Higher is better, and no amount of rescaling can manufacture it."
        />
      </div>

      {auc && (
        <p className="mt-6 border-t border-hairline pt-4 text-[13px] leading-relaxed text-ink-secondary">
          Pick one decision you got right and one you got wrong: you gave the right one
          more confidence{" "}
          <span className="font-medium tabular-nums text-ink">
            {Math.round(auc.auc * 100)}%
          </span>{" "}
          of the time.{" "}
          {auc.low > 0.5 ? (
            <>That clears chance — your confidence carries real information.</>
          ) : (
            <>
              <em>A coin flip would manage 50%</em>, and the range here still includes it,
              so this isn&rsquo;t yet evidence either way.
            </>
          )}{" "}
          <span className="text-ink-muted tabular-nums">
            95% range {Math.round(auc.low * 100)}–{Math.round(auc.high * 100)}%.
          </span>
        </p>
      )}

      <p className="mt-4 text-[12px] leading-relaxed text-ink-muted">
        The third part of the score, uncertainty ({parts.uncertainty.toFixed(3)}), is how
        hard the decisions you chose to log were. It isn&rsquo;t yours to fix and
        isn&rsquo;t counted against you.
      </p>
    </div>
  );
}
