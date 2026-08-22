import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CalibrationChart } from "@/components/calibration-chart";
import { CalibrationFan } from "@/components/calibration-fan";
import { SharpnessCard } from "@/components/sharpness-card";
import { HypothesisLedger } from "@/components/hypothesis-ledger";
import { ExperimentCard } from "@/components/experiment-card";
import { AdjudicationCard } from "@/components/adjudication-card";
import { ConsultationSplit } from "@/components/consultation-split";
import { InsightsPanel } from "@/components/insights-panel";
import { StarterList } from "@/components/starter-list";
import { Card } from "@/components/card";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { HindsightCard } from "@/components/hindsight-card";
import { getLatestAnalysis } from "@/lib/analysis";
import { inferenceOptions, runAnalysis, runAnalysisOnCloud } from "@/lib/actions";
import {
  accuracyFor,
  averageConfidence,
  brierScore,
  calibrationCurve,
  calibrationGap,
  expectedCalibrationError,
  gapIsMeaningful,
  hindsight,
  hindsightSignificance,
  splitByConsultation,
} from "@/lib/calibration";
import { calibrationBand, fitRecalibration, recalibrate } from "@/lib/recalibration";
import { decomposeBrier, discriminationInterval, verdict } from "@/lib/discrimination";
import { poolCategories, worstCategory } from "@/lib/pooling";
import { latestLedger } from "@/lib/hypotheses/run";
import { premortemExperiment } from "@/lib/experiment";
import { adjudicationSplit } from "@/lib/adjudication";

export const dynamic = "force-dynamic";

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="flex-1">
      <dt className="eyebrow">{label}</dt>
      {/* Numerals stay in the sans — a serif figure reads as decoration. */}
      <dd className="mt-1.5 text-[26px] font-medium leading-none tracking-tight">{value}</dd>
      <dd className="mt-2 text-[13px] leading-relaxed text-ink-secondary">{note}</dd>
    </div>
  );
}

export default async function DashboardPage() {
  const resolved = await prisma.entry.findMany({ where: { status: "resolved" } });
  const openCount = await prisma.entry.count({ where: { status: "open" } });
  const overdueCount = await prisma.entry.count({
    where: { status: "open", resolutionDate: { lt: new Date() } },
  });

  const analysis = await getLatestAnalysis();
  const options = await inferenceOptions();
  const buckets = calibrationCurve(resolved);
  const stated = averageConfidence(resolved);
  const actual = accuracyFor(resolved);
  const gap = calibrationGap(resolved);
  const ece = expectedCalibrationError(resolved);
  const brier = brierScore(resolved);
  const fit = fitRecalibration(resolved);
  // The headline and the fitted curve are two inferences about the same
  // question, and they must not be able to disagree on one page — a verdict up
  // top over a chart that says the data can't support it is exactly the
  // incoherence this product exists to avoid. The fitted model is the stronger
  // of the two, so it decides; the Wilson check only stands in when there is no
  // fit to consult.
  const solid = fit ? !fit.indistinguishableFromCalibrated : gapIsMeaningful(resolved);
  const { solo, consulted } = splitByConsultation(resolved);
  const memory = hindsight(resolved);
  const memorySignificance = hindsightSignificance(resolved);
  const band = fit ? calibrationBand(fit) : null;
  const anchors = fit
    ? [50, 70, 80, 90, 95].map((stated) => ({ stated, ...recalibrate(fit, stated) }))
    : [];
  const parts = decomposeBrier(resolved);
  const auc = discriminationInterval(resolved);
  const pooled = poolCategories(resolved);
  const ledger = await latestLedger();
  const experiment = premortemExperiment(resolved);
  const pendingChecks = await prisma.entry.count({
    where: { status: "open", resolver: { not: null } },
  });
  const adjudication = adjudicationSplit(resolved, pendingChecks);

  if (resolved.length === 0) {
    return (
      <div className="rise space-y-10">
        <header className="max-w-xl">
          <p className="eyebrow">Calibration</p>
          <h1 className="display mt-4 text-[42px]">Nothing to measure yet.</h1>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-secondary">
            Calibration needs decisions that have actually resolved. The catch is that the
            decisions worth journalling take months to settle — so start somewhere faster.
          </p>
          <Link
            href="/journal/new"
            className="mt-6 inline-block rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-page transition-opacity duration-200 hover:opacity-85"
          >
            Write your own entry
          </Link>
          {openCount > 0 && (
            <p className="mt-4 text-[13px] text-ink-muted">
              {openCount} {openCount === 1 ? "entry is" : "entries are"} waiting on an outcome.
            </p>
          )}
        </header>
        <StarterList />
      </div>
    );
  }

  const overconfident = gap !== null && gap > 0;

  return (
    <div className="rise space-y-8">
      <header className="border-b border-hairline pb-9">
        <p className="eyebrow">Calibration</p>

        <h1 className="display mt-4 max-w-3xl text-[40px] sm:text-[52px]">
          {gap === null ? (
            "Not enough resolved decisions yet."
          ) : solid ? (
            overconfident ? (
              <>
                You were sure{" "}
                <span className="font-sans text-[0.86em] font-medium tracking-tight" style={{ color: "var(--critical)" }}>
                  {gap} points
                </span>{" "}
                more often than you were right.
              </>
            ) : (
              <>
                You sell yourself short by{" "}
                <span className="font-sans text-[0.86em] font-medium tracking-tight" style={{ color: "var(--accent)" }}>
                  {Math.abs(gap)} points
                </span>
                .
              </>
            )
          ) : (
            <>
              Leaning{" "}
              <span className="font-sans text-[0.86em] font-medium tracking-tight">
                {Math.abs(gap)} points {overconfident ? "overconfident" : "underconfident"}
              </span>
              , <em>but not yet past the noise.</em>
            </>
          )}
        </h1>

        <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-ink-secondary">
          Across <span className="tabular-nums text-ink">{resolved.length}</span> resolved
          decisions you said you were{" "}
          <span className="tabular-nums text-ink">{stated}%</span> confident on average, and
          turned out right <span className="tabular-nums text-ink">{actual}%</span> of the
          time{openCount > 0 && <> · {openCount} still open</>}.
          {!solid && (
            <>
              {" "}
              At this sample size a gap that size is still inside what chance would produce,
              so treat it as a hint rather than a verdict.
            </>
          )}
        </p>

        <dl className="mt-8 flex flex-col gap-6 sm:flex-row sm:gap-10">
          <Metric
            label="Calibration error"
            value={`${ece} pts`}
            note="Ignores which direction you err in, so being over and under can't cancel out."
          />
          <Metric
            label="Brier score"
            value={String(brier)}
            note="Rewards being right, punishes being confidently wrong. 0.25 is what you'd score saying 50% to everything."
          />
        </dl>
      </header>

      <InsightsPanel
        insights={analysis?.insights ?? null}
        entriesAnalyzed={analysis?.entriesAnalyzed ?? null}
        runAt={analysis?.createdAt ?? null}
        resolvedSince={analysis?.resolvedSince ?? 0}
        ranLocally={analysis?.ranLocally ?? null}
        backend={analysis?.backend ?? null}
        options={options}
        action={runAnalysis}
        cloudAction={runAnalysisOnCloud}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card
            title="Confidence against reality"
            caption="Fitted across the whole scale rather than bucket by bucket, so forty decisions say more than five separate estimates could. The shaded band is what the data actually pins down."
          >
            {band && fit ? (
              <CalibrationFan
                band={band}
                buckets={buckets.map((b) => ({
                  stated: b.statedConfidence,
                  actual: b.actualAccuracy,
                  count: b.count,
                }))}
                anchors={anchors}
              />
            ) : (
              <CalibrationChart buckets={buckets} />
            )}
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

      {ledger && (
        <Card
          title="What survived being checked"
          caption="Claims about how you reason, generated from your earlier decisions and then tested against the ones held back from them. Kept whether they held or not."
        >
          <HypothesisLedger ledger={ledger} />
        </Card>
      )}

      {parts && (
        <Card
          title="Honest, or useful"
          caption="Being well calibrated and being worth listening to are different achievements, and the overall gap can't tell them apart."
        >
          <SharpnessCard parts={parts} auc={auc} verdict={verdict(parts, auc)} />
        </Card>
      )}

      {memory && (
        <Card
          title="What you remember saying"
          caption="At resolution you're asked to recall your own confidence before the stored figure is shown. The gap between the two is the bias the journal exists to defeat — so it gets measured rather than assumed."
        >
          <HindsightCard
            stats={memory}
            significance={memorySignificance}
            missingRecall={resolved.length - memory.n}
          />
        </Card>
      )}

      {pooled && (
        <Card
          title="Where you're off"
          caption="Miscalibration isn't evenly spread. This is the part you can act on — a weak domain is a different instruction from being weak generally."
        >
          <CategoryBreakdown result={pooled} worst={worstCategory(pooled)} />
        </Card>
      )}

      {(adjudication.external.n > 0 || adjudication.pendingChecks > 0) && (
        <Card
          title="Who graded it"
          caption="Every other number here rests on outcomes you recorded about yourself — the person marking the paper is the one who sat the exam. These are the decisions something else settled."
        >
          <AdjudicationCard split={adjudication} />
        </Card>
      )}

      <Card
        title="Does the premortem help?"
        caption="Doxa now interrupts you when you're very sure. Whether that interruption does anything is a claim like any other, so it fires at random and gets tested."
      >
        <ExperimentCard result={experiment} />
      </Card>

      <Link
        href="/journal"
        className="group flex items-center justify-between gap-4 rounded-2xl border border-hairline bg-surface px-6 py-5 transition-colors duration-200 hover:border-hairline-strong"
      >
        <span className="text-[14px] text-ink-secondary">
          {overdueCount > 0 ? (
            <>
              <span className="font-medium" style={{ color: "var(--critical)" }}>
                {overdueCount} {overdueCount === 1 ? "decision is" : "decisions are"} past
                the date you said you&rsquo;d know.
              </span>{" "}
              Resolving {overdueCount === 1 ? "it" : "them"} is what keeps the numbers honest.
            </>
          ) : openCount > 0 ? (
            `${openCount} ${openCount === 1 ? "decision is" : "decisions are"} still waiting on an outcome.`
          ) : (
            "Every decision you've logged has been resolved."
          )}
        </span>
        <span className="shrink-0 text-[14px] font-medium">
          Open the journal{" "}
          <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </Link>

      <p className="text-[12px] text-ink-muted">
        Everything here lives in a local SQLite file, hash-chained so an edit to the past
        is detectable.{" "}
        <a href="/api/export?format=json" className="underline hover:text-ink">
          Export JSON
        </a>{" "}
        ·{" "}
        <a href="/api/export?format=csv" className="underline hover:text-ink">
          Export CSV
        </a>
      </p>
    </div>
  );
}
