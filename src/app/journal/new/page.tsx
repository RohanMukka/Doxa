import { createEntry } from "@/lib/actions";
import { ConfidenceSlider } from "./confidence-slider";

export default function NewEntryPage() {
  const today = new Date();
  const defaultResolution = new Date(today);
  defaultResolution.setMonth(defaultResolution.getMonth() + 1);
  const defaultResolutionStr = defaultResolution.toISOString().slice(0, 10);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">New entry</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Write it down before you know how it turns out. That&rsquo;s the whole point.
      </p>

      <form action={createEntry} className="mt-8 space-y-6">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="decision" className="text-sm font-medium">
            What are you deciding?
          </label>
          <textarea
            id="decision"
            name="decision"
            required
            rows={2}
            placeholder="e.g. Turn down the offer and stay in my current role."
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="reasoning" className="text-sm font-medium">
            Why?
          </label>
          <textarea
            id="reasoning"
            name="reasoning"
            required
            rows={3}
            placeholder="Your actual reasoning, in your own words."
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
          />
        </div>

        <ConfidenceSlider />

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="category" className="text-sm font-medium">
              Category
            </label>
            <input
              type="text"
              id="category"
              name="category"
              placeholder="career, money, health…"
              className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="resolutionDate" className="text-sm font-medium">
              When will you know?
            </label>
            <input
              type="date"
              id="resolutionDate"
              name="resolutionDate"
              required
              defaultValue={defaultResolutionStr}
              className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="consultedOthers" className="accent-foreground" />
          I talked this through with someone else first
        </label>

        <button
          type="submit"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Save entry
        </button>
      </form>
    </div>
  );
}
