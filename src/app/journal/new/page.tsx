import { createEntry } from "@/lib/actions";
import { EntryForm } from "@/components/entry-form";
import { priorsForEntry } from "@/lib/priors-query";

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
  const priors = await priorsForEntry();

  return (
    <div className="rise max-w-xl">
      <header className="border-b border-hairline pb-7">
        <p className="eyebrow">New entry</p>
        <h1 className="display mt-4 text-[36px]">
          Write it down <em>before</em> you know.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-secondary">
          Memory rewrites itself once the answer arrives — you&rsquo;ll remember having been
          more certain, or less, in whichever direction flatters you. That edit is the whole
          reason this exists.
        </p>
      </header>

      <EntryForm
        action={createEntry}
        priors={priors}
        defaultDecision={decision}
        defaultCategory={category}
        defaultResolutionDate={DATE_ONLY.test(requested) ? requested : defaultDate()}
      />
    </div>
  );
}
