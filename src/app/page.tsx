import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CalibrationChart } from "@/components/calibration-chart";
import { ConsultationSplit } from "@/components/consultation-split";
import { InsightsPanel } from "@/components/insights-panel";
import { getLatestAnalysis } from "@/lib/analysis";
import { runAnalysis } from "@/lib/actions";
import {
  accuracyFor,
  averageConfidence,
  brierScore,
  calibrationCurve,
  calibrationGap,
  expectedCalibrationError,
  gapIsMeaningful,
  splitByConsultation,
} from "@/lib/calibration";

export const dynamic = "force-dynamic";

function Card({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-hairline bg-surface p-6">
      <h2 className="text-sm font-semibold">{title}</h2>
      {caption && <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{caption}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function DashboardPage() {
  const resolved = await prisma.entry.findMany({ where: { status: "resolved" } });
  const openCount = await prisma.entry.count({ where: { status: "open" } });

  const analysis = await getLatestAnalysis();
  const buckets = calibrationCurve(resolved);
  const stated = averageConfidence(resolved);
  const actual = accuracyFor(resolved);
  const gap = calibrationGap(resolved);
  const ece = expectedCalibrationError(resolved);
  const brier = brierScore(resolved);
  const solid = gapIsMeaningful(resolved);
  const { solo, consulted } = splitByConsultation(resolved);

  if (resolved.length === 0) {
    return (
      <div className="max-w-lg space-y-4 py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Nothing to measure yet</h1>
        <p className="text-sm leading-relaxed text-ink-secondary">
          Log a few decisions with how confident you are, then come back once you know how
          they turned out. The gap between those two numbers is the whole point.
        </p>
        <Link
          href="/journal/new"
          className="inline-block rounded-lg bg-ink px-4 py-2 text-sm font-medium text-page transition-opacity hover:opacity-90"
        >
          Write your first entry
        </Link>
        {openCount > 0 && (
          <p className="text-sm text-ink-muted">
            {openCount} {openCount === 1 ? "entry is" : "entries are"} waiting to be resolved.
          </p>
        )}
      </div>
    );
  }

  const overconfident = gap !== null && gap > 0;

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <p className="text-xs font-medium uppercase tracking-widest text-ink-muted">
          Calibration
        </p>
        <h1 className="mt-2 max-w-2xl text-3xl font-semibold leading-tight tracking-tight">
          {gap === null ? (
            "Not enough resolved decisions yet."
          ) : solid ? (
            overconfident ? (
              <>
                You were sure{" "}
                <span className="tabular-nums" style={{ color: "var(--critical)" }}>
                  {gap} points
                </span>{" "}
                more often than you were right.
              </>
            ) : (
              <>
                You sell yourself short by{" "}
                <span className="tabular-nums" style={{ color: "var(--accent)" }}>
                  {Math.abs(gap)} points
                </span>
                .
              </>
            )
          ) : (
            <>
              Leaning{" "}
              <span className="tabular-nums" style={{ color: "var(--ink)" }}>
                {Math.abs(gap)} points {overconfident ? "overconfident" : "underconfident"}
              </span>
              , but not yet past the noise.
            </>
          )}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-secondary">
          Across {resolved.length} resolved decisions you said you were{" "}
          <span className="tabular-nums">{stated}%</span> confident on average, and turned out
          right <span className="tabular-nums">{actual}%</span> of the time
          {openCount > 0 && ` · ${openCount} still open`}.
          {!solid && (
            <>
              {" "}
              At this sample size a gap that size is still inside what chance would produce,
              so treat it as a hint rather than a verdict.
            </>
          )}
        </p>

        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <dt className="text-xs text-ink-muted">Calibration error</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">{ece} pts</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Brier score</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">{brier}</dd>
          </div>
          <div className="max-w-xs">
            <dt className="text-xs text-ink-muted">What those mean</dt>
            <dd className="mt-0.5 text-xs leading-relaxed text-ink-secondary">
              Calibration error ignores which direction you err in, so being over and under
              can&rsquo;t cancel out. Brier rewards being right and punishes being confidently
              wrong — 0.25 is what you&rsquo;d score by saying 50% to everything.
            </dd>
          </div>
        </dl>
      </header>

      <InsightsPanel
        insights={analysis?.insights ?? null}
        entriesAnalyzed={analysis?.entriesAnalyzed ?? null}
        action={runAnalysis}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card
            title="Confidence against reality"
            caption="A perfectly calibrated person's line would sit on the dashed one. Below it means you were more certain than the outcomes justified."
          >
            <CalibrationChart buckets={buckets} />
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card
            title="Alone, or talked through"
            caption="The same confidence means different things depending on whether anyone else saw your reasoning first."
          >
            <ConsultationSplit
              groups={[
                {
                  label: "Reasoned alone",
                  stated: averageConfidence(solo),
                  actual: accuracyFor(solo),
                  count: solo.length,
                  brier: brierScore(solo),
                },
                {
                  label: "Talked it through",
                  stated: averageConfidence(consulted),
                  actual: accuracyFor(consulted),
                  count: consulted.length,
                  brier: brierScore(consulted),
                },
              ]}
            />
          </Card>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-hairline bg-surface px-6 py-4">
        <p className="text-sm text-ink-secondary">
          {openCount > 0
            ? `${openCount} ${openCount === 1 ? "decision is" : "decisions are"} still waiting on an outcome.`
            : "Every decision you've logged has been resolved."}
        </p>
        <Link href="/journal" className="text-sm font-medium hover:underline">
          Open the journal →
        </Link>
      </div>
    </div>
  );
}
