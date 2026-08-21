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
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
      <span className="rounded-md px-1.5 py-0.5 font-medium tabular-nums" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
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
      className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
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
      <div className="space-y-6 py-8">
        <div className="max-w-lg space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight">Your journal is empty</h1>
          <p className="text-sm leading-relaxed text-ink-secondary">
            A decision journal only works if you write the entry before you know the answer.
          </p>
          <Link
            href="/journal/new"
            className="inline-block rounded-lg bg-ink px-4 py-2 text-sm font-medium text-page transition-opacity hover:opacity-90"
          >
            Write your own entry
          </Link>
        </div>
        <StarterList />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="pt-2">
        <h1 className="text-3xl font-semibold tracking-tight">Journal</h1>
        <p className="mt-2 text-sm text-ink-secondary tabular-nums">
          {entries.length} entries · {open.length} open · {resolved.length} resolved
        </p>
      </header>

      {open.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-widest text-ink-muted">
            Awaiting an outcome
          </h2>
          {open.map((entry) => (
            <article
              key={entry.id}
              className="rounded-xl border border-hairline bg-surface p-5"
            >
              <p className="font-medium leading-snug">{entry.decision}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
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

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-widest text-ink-muted">
          Resolved
        </h2>
        {resolved.map((entry) => (
          <article key={entry.id} className="rounded-xl border border-hairline bg-surface p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium leading-snug">{entry.decision}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  {entry.reasoning}
                </p>
                {entry.resolutionNote && (
                  <p className="mt-3 border-l-2 border-hairline pl-3 text-sm leading-relaxed text-ink-muted">
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
