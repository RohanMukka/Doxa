import { createEntry } from "@/lib/actions";
import { EntryForm } from "@/components/entry-form";

function defaultDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  // Local parts, not toISOString — the latter shifts the date west of UTC.
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export default async function NewEntryPage({ searchParams }: PageProps<"/journal/new">) {
  // Prefilled from a starter prompt on the empty state.
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

  const decision = one(params.decision);
  const category = one(params.category);
  const requested = one(params.resolutionDate);

  return (
    <div className="max-w-xl py-2">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">New entry</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          Write it down before you know how it turns out. Memory rewrites itself once the
          answer arrives — that&rsquo;s the whole reason this exists.
        </p>
      </header>

      <EntryForm
        action={createEntry}
        defaultDecision={decision}
        defaultCategory={category}
        defaultResolutionDate={DATE_ONLY.test(requested) ? requested : defaultDate()}
      />
    </div>
  );
}
