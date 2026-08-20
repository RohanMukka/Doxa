import { prisma } from "@/lib/prisma";
import { resolveEntry } from "@/lib/actions";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function JournalPage() {
  const entries = await prisma.entry.findMany({ orderBy: { createdAt: "desc" } });
  const open = entries.filter((e) => e.status === "open");
  const resolved = entries.filter((e) => e.status === "resolved");

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Journal</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          {entries.length} entries · {open.length} open · {resolved.length} resolved
        </p>
      </div>

      {open.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
            Awaiting resolution
          </h2>
          <div className="space-y-4">
            {open.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-black/10 p-4 dark:border-white/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{entry.decision}</p>
                    <p className="mt-1 text-sm text-black/60 dark:text-white/60">{entry.reasoning}</p>
                    <p className="mt-2 text-xs text-black/40 dark:text-white/40">
                      {entry.confidence}% confident
                      {entry.category ? ` · ${entry.category}` : ""}
                      {entry.consultedOthers ? " · talked it through" : " · reasoned alone"}
                      {" · expected by "}
                      {formatDate(entry.resolutionDate)}
                    </p>
                  </div>
                </div>
                <form action={resolveEntry} className="mt-4 flex flex-wrap items-end gap-3 border-t border-black/10 pt-4 dark:border-white/10">
                  <input type="hidden" name="id" value={entry.id} />
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-black/50 dark:text-white/50">Outcome</label>
                    <select
                      name="outcome"
                      required
                      defaultValue=""
                      className="rounded-md border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/15"
                    >
                      <option value="" disabled>
                        Select…
                      </option>
                      <option value="correct">Turned out right</option>
                      <option value="incorrect">Turned out wrong</option>
                    </select>
                  </div>
                  <div className="flex flex-1 min-w-[12rem] flex-col gap-1">
                    <label className="text-xs text-black/50 dark:text-white/50">Note (optional)</label>
                    <input
                      type="text"
                      name="resolutionNote"
                      placeholder="What actually happened?"
                      className="w-full rounded-md border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/15"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background hover:opacity-90"
                  >
                    Resolve
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
          Resolved
        </h2>
        <div className="space-y-3">
          {resolved.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg border border-black/10 p-4 dark:border-white/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{entry.decision}</p>
                  <p className="mt-1 text-sm text-black/60 dark:text-white/60">{entry.reasoning}</p>
                  {entry.resolutionNote && (
                    <p className="mt-2 text-sm italic text-black/50 dark:text-white/50">
                      &ldquo;{entry.resolutionNote}&rdquo;
                    </p>
                  )}
                  <p className="mt-2 text-xs text-black/40 dark:text-white/40">
                    {entry.confidence}% confident
                    {entry.category ? ` · ${entry.category}` : ""}
                    {entry.consultedOthers ? " · talked it through" : " · reasoned alone"}
                    {" · resolved "}
                    {formatDate(entry.resolutionDate)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    entry.outcome === "correct"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                  }`}
                >
                  {entry.outcome === "correct" ? "Right" : "Wrong"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
