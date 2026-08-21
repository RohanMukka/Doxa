import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveEntry } from "@/lib/actions";
import { ResolveForm } from "@/components/resolve-form";
import { StarterList } from "@/components/starter-list";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function Meta({
  confidence,
  category,
  consultedOthers,
  trailing,
}: {
  confidence: number;
  category: string | null;
  consultedOthers: boolean;
  trailing: string;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[12px] text-ink-muted">
      <span
        className="rounded-full px-2 py-0.5 font-medium tabular-nums"
        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
      >
        {confidence}% sure
      </span>
      <span aria-hidden="true">·</span>
      <span>{consultedOthers ? "talked it through" : "reasoned alone"}</span>
      {category && (
        <>
          <span aria-hidden="true">·</span>
          <span>{category}</span>
        </>
      )}
      <span aria-hidden="true">·</span>
      <span>{trailing}</span>
    </div>
  );
}

/** Status colors can't carry meaning alone, so the glyph and word do the work. */
function OutcomeBadge({ outcome }: { outcome: string | null }) {
  const right = outcome === "correct";
  return (
    <span
      className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium"
      style={{
        background: right ? "var(--good-wash)" : "var(--critical-wash)",
        color: right ? "var(--good)" : "var(--critical)",
      }}
    >
      <span aria-hidden="true">{right ? "✓" : "✕"}</span>
      {right ? "Right" : "Wrong"}
    </span>
  );
}

export default async function JournalPage() {
  const entries = await prisma.entry.findMany({ orderBy: { createdAt: "desc" } });
  const open = entries.filter((e) => e.status === "open");
  const resolved = entries.filter((e) => e.status === "resolved");

  if (entries.length === 0) {
    return (
      <div className="rise space-y-10">
        <header className="max-w-xl">
          <p className="eyebrow">Journal</p>
          <h1 className="display mt-4 text-[42px]">Nothing written down yet.</h1>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-secondary">
            A decision journal only works if you write the entry before you know the answer.
          </p>
          <Link
            href="/journal/new"
            className="mt-6 inline-block rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-page transition-opacity duration-200 hover:opacity-85"
          >
            Write your own entry
          </Link>
        </header>
        <StarterList />
      </div>
    );
  }

  return (
    <div className="rise space-y-12">
      <header className="border-b border-hairline pb-8">
        <p className="eyebrow">Journal</p>
        <h1 className="display mt-4 text-[40px]">Everything you wrote down first.</h1>
        <p className="mt-4 text-[13px] text-ink-secondary tabular-nums">
          {entries.length} entries · {open.length} open · {resolved.length} resolved
        </p>
      </header>

      {open.length > 0 && (
        <section className="space-y-4">
          <h2 className="eyebrow">Awaiting an outcome</h2>
          {open.map((entry) => (
            <article
              key={entry.id}
              className="rounded-2xl border border-hairline bg-surface p-6 shadow-[var(--shadow-card)]"
            >
              <p className="display text-[19px] leading-snug">{entry.decision}</p>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-secondary">
                {entry.reasoning}
              </p>
              <Meta
                confidence={entry.confidence}
                category={entry.category}
                consultedOthers={entry.consultedOthers}
                trailing={`due ${formatDate(entry.resolutionDate)}`}
              />
              <ResolveForm id={entry.id} action={resolveEntry} />
            </article>
          ))}
        </section>
      )}

      <section className="space-y-4">
        <h2 className="eyebrow">Resolved</h2>
        {resolved.map((entry) => (
          <article
            key={entry.id}
            className="rounded-2xl border border-hairline bg-surface p-6 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-start justify-between gap-5">
              <div className="min-w-0">
                <p className="display text-[19px] leading-snug">{entry.decision}</p>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-secondary">
                  {entry.reasoning}
                </p>
                {entry.resolutionNote && (
                  <p
                    className="mt-4 border-l-2 pl-4 text-[14px] italic leading-relaxed text-ink-muted"
                    style={{ borderColor: "var(--hairline-strong)" }}
                  >
                    {entry.resolutionNote}
                  </p>
                )}
                <Meta
                  confidence={entry.confidence}
                  category={entry.category}
                  consultedOthers={entry.consultedOthers}
                  trailing={`resolved ${formatDate(entry.resolutionDate)}`}
                />
              </div>
              <OutcomeBadge outcome={entry.outcome} />
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
