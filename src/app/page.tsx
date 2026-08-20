import { prisma } from "@/lib/prisma";
import { CalibrationChart } from "@/components/calibration-chart";
import {
  accuracyFor,
  averageConfidence,
  calibrationCurve,
  calibrationGap,
  splitByConsultation,
} from "@/lib/calibration";

export const dynamic = "force-dynamic";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
      <p className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-black/50 dark:text-white/50">{sub}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const resolved = await prisma.entry.findMany({ where: { status: "resolved" } });
  const openCount = await prisma.entry.count({ where: { status: "open" } });

  const buckets = calibrationCurve(resolved);
  const stated = averageConfidence(resolved);
  const actual = accuracyFor(resolved);
  const gap = calibrationGap(resolved);
  const { solo, consulted } = splitByConsultation(resolved);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calibration</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          {resolved.length} resolved decisions · {openCount} still open
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="You said" value={stated !== null ? `${stated}%` : "—"} sub="average confidence" />
        <Stat label="Actually right" value={actual !== null ? `${actual}%` : "—"} sub="across all resolved" />
        <Stat
          label="Gap"
          value={gap !== null ? `${gap > 0 ? "+" : ""}${gap} pts` : "—"}
          sub={gap !== null && gap > 0 ? "overconfident" : "underconfident"}
        />
      </div>

      <section className="rounded-lg border border-black/10 p-5 dark:border-white/10">
        <h2 className="text-sm font-medium">Confidence vs. reality</h2>
        <p className="mt-1 mb-4 text-xs text-black/50 dark:text-white/50">
          Where the solid line sits below the dashed one, you were more sure than you should have been.
        </p>
        <CalibrationChart buckets={buckets} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Stat
          label="Reasoned alone"
          value={accuracyFor(solo) !== null ? `${accuracyFor(solo)}%` : "—"}
          sub={`right, on ${averageConfidence(solo) ?? "—"}% average confidence · ${solo.length} decisions`}
        />
        <Stat
          label="Talked it through"
          value={accuracyFor(consulted) !== null ? `${accuracyFor(consulted)}%` : "—"}
          sub={`right, on ${averageConfidence(consulted) ?? "—"}% average confidence · ${consulted.length} decisions`}
        />
      </section>
    </div>
  );
}
