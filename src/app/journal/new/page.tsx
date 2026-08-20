import { createEntry } from "@/lib/actions";
import { EntryForm } from "@/components/entry-form";

export default function NewEntryPage() {
  const defaultResolution = new Date();
  defaultResolution.setMonth(defaultResolution.getMonth() + 1);

  // Local parts, not toISOString — the latter shifts the date for anyone west of UTC.
  const yyyy = defaultResolution.getFullYear();
  const mm = String(defaultResolution.getMonth() + 1).padStart(2, "0");
  const dd = String(defaultResolution.getDate()).padStart(2, "0");

  return (
    <div className="max-w-xl py-2">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">New entry</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          Write it down before you know how it turns out. Memory rewrites itself once the
          answer arrives — that&rsquo;s the whole reason this exists.
        </p>
      </header>

      <EntryForm action={createEntry} defaultResolutionDate={`${yyyy}-${mm}-${dd}`} />
    </div>
  );
}
