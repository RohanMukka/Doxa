import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { recallConfidence, resolveEntry, revealConfidence } from "@/lib/actions";
import { ResolveForm } from "@/components/resolve-form";
import { StarterList } from "@/components/starter-list";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/**
 * The stated confidence on an open decision, or the seal over it.
 *
 * While a decision is open the number is deliberately not rendered — seeing it
 * invites you to re-anchor on it, and it would make the recall question at
 * resolution meaningless, since the answer would be sitting on the same page.
 * Unsealing is allowed. It is also recorded, and it costs that entry its place
 * in the hindsight statistics, which is the honest price rather than a
 * punishment.
 */
function Confidence({ value, entryId }: { value: number | null; entryId?: string }) {
  if (value !== null) {
    return (
      <span
        className="rounded-full px-2 py-0.5 font-medium tabular-nums"
        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
      >
        {value}% sure
      </span>
    );
  }

  return (
    <form action={revealConfidence} className="contents">
      <input type="hidden" name="id" value={entryId} />
      <button
        type="submit"
        className="rounded-full border border-dashed px-2 py-0.5 font-medium transition-colors duration-200 hover:text-ink"
        style={{ borderColor: "var(--hairline-strong)" }}
        title="Recorded when you look, and drops this entry from the hindsight statistics."
      >
        confidence sealed &middot; reveal
      </button>
    </form>
  );
}

function Meta({
  confidence,
  entryId,
  category,
  consultedOthers,
  trailing,
}: {
  confidence: number | null;
  entryId?: string;
  category: string | null;
  consultedOthers: boolean;
  trailing: string;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[12px] text-ink-muted">
      <Confidence value={confidence} entryId={entryId} />
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

/**
 * The criterion, as written in advance. Rendered as a quote rather than a field
 * because that is what it is — a sentence the person is now being held to.
 */
function Falsifier({ text }: { text: string | null }) {
  if (!text) {
    return (
      <p className="mt-3 text-[12px] italic text-ink-muted">
        No criterion recorded — this entry predates preregistration.
      </p>
    );
  }
  return (
    <p className="mt-3 text-[13px] leading-relaxed text-ink-secondary">
      <span className="eyebrow mr-2 align-middle">Wrong if</span>
      {text}
    </p>
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
  const resolved = entries.filter((e) => e.status === "resolved");

  // Anything past the date you said you'd know is the work: an unresolved
  // journal quietly stops measuring anything.
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const allOpen = entries.filter((e) => e.status === "open");
  const due = allOpen.filter((e) => e.resolutionDate <= endOfToday);
  const upcoming = allOpen.filter((e) => e.resolutionDate > endOfToday);

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
          {entries.length} entries · {allOpen.length} open · {resolved.length} resolved
          {due.length > 0 && (
            <>
              {" · "}
              <span className="font-medium" style={{ color: "var(--critical)" }}>
                {due.length} ready to resolve
              </span>
            </>
          )}
        </p>
      </header>

      {due.length > 0 && (
        <section className="space-y-4">
          <h2 className="eyebrow" style={{ color: "var(--critical)" }}>
            Ready to resolve — you said you&rsquo;d know by now
          </h2>
          {due.map((entry) => (
            <article
              key={entry.id}
              className="rounded-2xl border border-hairline bg-surface p-6 shadow-[var(--shadow-card)]"
            >
              <p className="display text-[19px] leading-snug">{entry.decision}</p>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-secondary">
                {entry.reasoning}
              </p>
              <Falsifier text={entry.falsifier} />
              <Meta
                confidence={entry.confidenceRevealedAt ? entry.confidence : null}
                entryId={entry.id}
                category={entry.category}
                consultedOthers={entry.consultedOthers}
                trailing={`due ${formatDate(entry.resolutionDate)}`}
              />
              <ResolveForm
                id={entry.id}
                alreadyAnswered={
                  entry.confidenceRevealedAt !== null || entry.recalledConfidence !== null
                }
                action={resolveEntry}
                recallAction={recallConfidence}
              />
            </article>
          ))}
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-4">
          <h2 className="eyebrow">Still open</h2>
          {upcoming.map((entry) => (
            <article
              key={entry.id}
              className="rounded-2xl border border-hairline bg-surface p-6 shadow-[var(--shadow-card)]"
            >
              <p className="display text-[19px] leading-snug">{entry.decision}</p>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-secondary">
                {entry.reasoning}
              </p>
              <Falsifier text={entry.falsifier} />
              <Meta
                confidence={entry.confidenceRevealedAt ? entry.confidence : null}
                entryId={entry.id}
                category={entry.category}
                consultedOthers={entry.consultedOthers}
                trailing={`due ${formatDate(entry.resolutionDate)}`}
              />
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
                <Falsifier text={entry.falsifier} />
                <Meta
                  confidence={entry.confidence}
                  category={entry.category}
                  consultedOthers={entry.consultedOthers}
                  trailing={`resolved ${formatDate(entry.resolutionDate)}`}
                />
                {entry.recalledConfidence !== null && (
                  <p className="mt-2 text-[12px] text-ink-muted">
                    You remembered saying{" "}
                    <span className="tabular-nums">{entry.recalledConfidence}%</span>
                    {entry.recallBlind === false && " (after looking)"}.
                  </p>
                )}
              </div>
              <OutcomeBadge outcome={entry.outcome} />
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
