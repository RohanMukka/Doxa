import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CalibrationChart } from "@/components/calibration-chart";
import { ConsultationSplit } from "@/components/consultation-split";
import { InsightsPanel } from "@/components/insights-panel";
import { StarterList } from "@/components/starter-list";
import { Card } from "@/components/card";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { HindsightCard } from "@/components/hindsight-card";
import { getLatestAnalysis } from "@/lib/analysis";
import { runAnalysis } from "@/lib/actions";
import {
  accuracyFor,
  averageConfidence,
  brierScore,
  byCategory,
  calibrationCurve,
  calibrationGap,
  expectedCalibrationError,
  gapIsMeaningful,
  hindsight,
  hindsightSignificance,
  mostMiscalibratedCategory,
  splitByConsultation,
} from "@/lib/calibration";

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
  const buckets = calibrationCurve(resolved);
  const stated = averageConfidence(resolved);
  const actual = accuracyFor(resolved);
  const gap = calibrationGap(resolved);
  const ece = expectedCalibrationError(resolved);
  const brier = brierScore(resolved);
  const solid = gapIsMeaningful(resolved);
  const { solo, consulted } = splitByConsultation(resolved);
  const memory = hindsight(resolved);
  const memorySignificance = hindsightSignificance(resolved);

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

      <Card
        title="Where you're off"
        caption="Miscalibration isn't evenly spread. This is the part you can act on — a weak domain is a different instruction from being weak generally."
      >
        <CategoryBreakdown
          categories={byCategory(resolved)}
          worst={mostMiscalibratedCategory(resolved)}
        />
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
        Everything here lives in a local SQLite file.{" "}
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
