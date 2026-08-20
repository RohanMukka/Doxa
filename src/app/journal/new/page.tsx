import { createEntry } from "@/lib/actions";
import { ConfidenceSlider } from "./confidence-slider";

const FIELD =
  "rounded-lg border border-hairline bg-surface px-3 py-2.5 text-sm leading-relaxed placeholder:text-ink-muted";

export default function NewEntryPage() {
  const defaultResolution = new Date();
  defaultResolution.setMonth(defaultResolution.getMonth() + 1);

  return (
    <div className="max-w-xl py-2">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">New entry</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          Write it down before you know how it turns out. Memory rewrites itself once the
          answer arrives — that&rsquo;s the whole reason this exists.
        </p>
      </header>

      <form action={createEntry} className="mt-8 space-y-7">
        <div className="flex flex-col gap-2">
          <label htmlFor="decision" className="text-sm font-medium">
            What are you deciding?
          </label>
          <textarea
            id="decision"
            name="decision"
            required
            rows={2}
            placeholder="Turn down the offer and stay in my current role."
            className={FIELD}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="reasoning" className="text-sm font-medium">
            Why?
          </label>
          <textarea
            id="reasoning"
            name="reasoning"
            required
            rows={4}
            placeholder="Your actual reasoning, in your own words. Don't tidy it up — the phrasing is what gets analysed later."
            className={FIELD}
          />
        </div>

        <ConfidenceSlider />

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="category" className="text-sm font-medium">
              Category <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              type="text"
              id="category"
              name="category"
              placeholder="career, money, health…"
              className={FIELD}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="resolutionDate" className="text-sm font-medium">
              When will you know?
            </label>
            <input
              type="date"
              id="resolutionDate"
              name="resolutionDate"
              required
              defaultValue={defaultResolution.toISOString().slice(0, 10)}
              className={FIELD}
            />
          </div>
        </div>

        <label className="flex items-start gap-2.5 rounded-lg border border-hairline bg-surface p-4 text-sm">
          <input
            type="checkbox"
            name="consultedOthers"
            className="mt-0.5"
            style={{ accentColor: "var(--accent)" }}
          />
          <span>
            I talked this through with someone else first
            <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
              Tracked separately, because whether anyone checked your reasoning tends to
              predict how well the confidence holds up.
            </span>
          </span>
        </label>

        <button
          type="submit"
          className="w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-page transition-opacity hover:opacity-90 sm:w-auto"
        >
          Save entry
        </button>
      </form>
    </div>
  );
}
