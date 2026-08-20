# Doxa

A decision journal that shows you where your confidence lies to you.

You log a decision *before* you know how it turns out — what you're deciding, your actual
reasoning, and how confident you are. Later you record what happened. Once enough
decisions have resolved, Doxa reads back across all of them and tells you where your
certainty and your accuracy come apart.

## Why

Human memory rewrites itself. After the fact you remember having been more sure, or less,
in whichever direction makes you look better. Decision journals exist because of that
specific failure — investors and forecasters keep them for exactly this reason — but the
tooling for them is mostly Notion templates.

The interesting part isn't the journal. It's what becomes visible once a year of entries
have resolved:

> Your certainty is highest exactly where you skip outside input. On the decisions you
> rated 85%+ and reasoned through alone, you were right 55% of the time; on the ones you
> rated just as highly after talking them through, you were right 88%.

That's a claim about *how you think*, not about any one decision — and it isn't something
you could have told yourself.

## What it does

- **Log a decision** with your reasoning, a confidence percentage, and when you expect to know.
- **Resolve it** later as right or wrong, with a note on what actually happened.
- **Calibration curve** — your stated confidence plotted against how often each confidence
  band actually turned out right. The gap between the two lines is your miscalibration.
- **Pattern analysis** — a Claude pass over every resolved entry that looks for *why* the
  gap is there: the phrases you reach for, the categories where certainty runs ahead of
  evidence, the situations where you don't check your thinking.

Accuracy statistics are computed in code and handed to the model, so it never has to count
anything — it works on the reasoning text, which is the part statistics can't see.

## Running it

```bash
npm install
cp .env.example .env      # then add your ANTHROPIC_API_KEY
npx prisma migrate dev    # creates the SQLite database
npm run seed              # loads the demo journal
npm run dev
```

Open http://localhost:3000.

`npm run seed` loads a year of entries for a fictional user — 41 resolved, 3 still open —
so the dashboard has something to measure on first run. The entries are hand-written and
carry a deliberate calibration pattern; the analysis pass has to actually find it. Click
**Find my patterns** on the dashboard to run it.

Without an `ANTHROPIC_API_KEY` everything works except the pattern analysis, which will
tell you the key is missing rather than failing silently.

A run costs roughly ten cents on the default model. If that matters, set
`DOXA_MODEL="claude-haiku-4-5"` in `.env` for about a fifth the cost — the findings come
out blunter, which is the tradeoff.

### Shipping the analysis with the repo

The analysis costs roughly ten cents a run, which is fine for you and awkward for anyone
who just wants to look at the project. So a run can be captured and committed:

```bash
npm run capture:analysis   # writes prisma/seed-analysis.json from your last run
```

`npm run seed` picks that file up, so a fresh clone opens on a dashboard already showing
model output with no key required. It replays a run that actually happened — the insights
are never hand-written, and if no run has been captured the panel stays empty and says so.

## Stack

Next.js (App Router) · TypeScript · Tailwind · Prisma + SQLite · Recharts · Claude API
