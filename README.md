# Doxa

A decision journal that shows you where your confidence lies to you.

You log a decision *before* you know how it turns out — what you're deciding, your actual
reasoning, how confident you are, and what would make you wrong. Later you record what
happened. Once enough decisions have resolved, Doxa reads back across all of them and
tells you where your certainty and your accuracy come apart.

The journal is an append-only, hash-chained log, so "I wrote this down beforehand" is
something the file can actually demonstrate rather than something you have to take on
trust.

![Doxa dashboard](docs/screenshots/01-dashboard-light.png)

## Why

Human memory rewrites itself. After the fact you remember having been more sure, or less,
in whichever direction makes you look better. Decision journals exist because of that
specific failure — investors and forecasters keep them for exactly this reason — but the
tooling for them is mostly Notion templates.

The interesting part isn't the journal. It's what becomes visible once a year of entries
have resolved: not *"you were wrong about this decision"*, but *"here is the pattern in how
you reason that keeps making you wrong"* — a claim about how you think, which is the kind
of thing you can't tell yourself.

## What it does

- **Log a decision** with your reasoning, a confidence percentage, when you expect to know,
  and — required — what would make it wrong. That last one is frozen at creation, because
  a criterion you write after the outcome is a criterion you write in your own favour.
- **Resolve it** later as right or wrong, with a note on what actually happened. Before the
  outcome goes in, you're asked to recall the confidence you gave — and the stored figure
  does not reach your browser until that answer is committed.
- **Hindsight, measured.** The gap between what you said and what you remember saying,
  split by how the decision turned out. Remembering more certainty after being right and
  less after being wrong are the same bias in opposite directions, so the spread between
  the two groups is what carries the significance test, not the raw average.
- **Calibration curve** — your stated confidence plotted against how often each confidence
  band actually turned out right, with 95% intervals.
- **Pattern analysis** — a pass over every resolved entry that looks for *why* the
  gap is there: the phrases you reach for, the categories where certainty runs ahead of
  evidence, the situations where you don't check your thinking. It carries the timestamp
  it ran at, and flags itself stale when decisions resolve afterwards.
- **Per-category calibration** — where you're off, not just whether. Categories below five
  resolved decisions are shown with their n but never ranked.
- **Ready to resolve** — anything past the date you said you'd know is surfaced first,
  because an unresolved journal quietly stops measuring anything.
- **Export** — every entry plus the computed metrics, as JSON or CSV.
- **`npm run verify`** — walks the chain and replays the log against the table, so a
  modified journal is detectable rather than merely discouraged.

Accuracy statistics are computed in code and handed to the model, so it never has to count
anything — it works on the reasoning text, which is the part statistics can't see.

## On not overclaiming

A tool about overconfidence has no business being overconfident, so:

- **Wilson intervals on every bucket.** A confidence band holding three decisions gets an
  error bar covering most of the scale, and renders hollow instead of solid.
- **Brier score and expected calibration error**, not just a hit rate. ECE is there because
  the intuitive metric — mean confidence minus accuracy — *cancels*: wildly overconfident at
  one end of the scale and equally underconfident at the other averages out to "perfectly
  calibrated". `src/lib/calibration.test.ts` pins that case.
- **Permutation tests where the sample is small.** The hindsight spread is tested by
  shuffling which decisions went well, ten thousand times, and counting how often chance
  produces a gap that big. No appeal to asymptotics that thirty entries haven't earned. On
  the seeded journal this returns p = 0.09, and the card says so instead of claiming a
  finding.
- **The headline backs off when the data can't support it.** If the overall gap sits inside
  the confidence interval, the dashboard says "leaning overconfident, but not yet past the
  noise" rather than asserting a number.

Low-confidence predictions are not failures, either: saying 30% and being right 30% of the
time is *good* calibration, and the metrics treat it that way.

![Calibration curve](docs/screenshots/02-calibration-curve.png)

## Running it

```bash
npm install
cp .env.example .env
npx prisma migrate dev    # creates the SQLite database
npm run seed              # loads the demo journal
npm run verify            # optional: confirm the seeded log hasn't been touched
npm run dev
```

Open http://localhost:3000.

## Where the analysis runs

Everything except the pattern analysis is arithmetic on a local file. The analysis is the
one feature that wants to read the whole journal at once — which made the old footer
("Doxa keeps everything on this machine") false, because it posted every entry to Google.

So a local model is the default:

```bash
ollama pull llama3.1:8b   # then just use the app
```

If no local model is reachable, the analysis does **not** quietly fall back. It stops and
tells you what running it on Google would send — how many entries, how many characters of
your own reasoning — and lets you decide. Consent is per run and never sticky: even
`DOXA_INFERENCE="cloud"` asks, because choosing a backend in config is not the same act as
agreeing to send your journal off the machine. From the command line the flag is something
you type: `npm run analyze -- --cloud`.

Every stored analysis records which backend produced it and whether it stayed local, and
the panel says so — including for the run committed to this repo, which was a hosted one.

The trade is real and it is yours to make: an 8B model on a laptop reasons less well over
forty entries than a hosted frontier model does.

A free Gemini key is available from [Google AI Studio](https://aistudio.google.com/apikey) —
no credit card. Setting it does not by itself allow anything to be sent.

`npm run seed` loads a year of entries for a fictional user — 41 resolved and 5 open, two of
them already past the date they said they'd know — so the dashboard has something to measure
on first run and the resolution flow is reachable without waiting. **The entries are written, not
collected**: they exist so the calibration and analysis features can be evaluated without
waiting a year. Every number on screen is computed honestly from them, but it is
illustrative data. Click **Find my patterns** to run the analysis over it.

Without either a local model or a `GEMINI_API_KEY`, everything works except the pattern
analysis, which says what it needs rather than failing silently.

Free-tier model availability moves around, so if the default model name is rejected:

```bash
npm run models   # lists what your key can actually reach
```

Then set `DOXA_MODEL` in `.env` to one of them. Flash-class models are the free ones — the
default is `gemini-3.6-flash`, since `gemini-2.5-flash` was retired for new keys.

To run it without the UI:

```bash
npm run analyze
```

## Tests

```bash
npm test
```

102 tests. The calibration maths (bucket boundaries, Wilson intervals, Brier score, the ECE
cancellation case, empty-journal paths), form validation including the UTC date bug and
impossible dates like `2026-02-31`, and the model-response parsing contract — that last one
runs without an API key, since malformed output is the failure most likely to reach a user.

The journal core has its own suite: canonical JSON (key order, negative zero, rejected
`Date`s), the hash preimage's resistance to a forged field boundary, chain verification
against an edited payload and a deleted event, every invalid state transition in the fold,
and the drift detector that catches a row written behind the log's back.

### Shipping the analysis with the repo

Anyone browsing the project shouldn't need their own key just to see what it does, so a
run can be captured and committed:

```bash
npm run capture:analysis   # writes prisma/seed-analysis.json from your last run
```

`npm run seed` picks that file up, so a fresh clone opens on a dashboard already showing
model output with no key required. It replays a run that actually happened — the insights
are never hand-written, and if no run has been captured the panel stays empty and says so.

## The cold-start problem

Calibration needs *resolved* decisions, and the decisions worth journalling take months to
resolve — so a new journal is dead weight for a year. That's the real adoption problem with
every decision-journal tool.

Doxa's answer is that calibration is a general habit rather than a per-topic skill: someone
who says 90% when they mean 70% does it on small predictions too. So the empty state offers
short-horizon predictions that settle in three to fourteen days — *will I finish the thing I
keep postponing this week?* — which gives you a real baseline in a fortnight, ready to carry
into the slow decisions that actually matter.

## Known limitations

- **Self-reported resolution.** You grade your own outcomes, which is exactly where motivated
  reasoning lives. Preregistered criteria narrow the gap — you're now grading against a
  sentence you wrote in advance — but they don't close it. External adjudication is the
  real fix and isn't built yet.
- **Small samples.** At journal-sized n most findings are directional. The app says so on
  screen rather than hiding it, which is the honest half of the fix.
- **The seal is against re-anchoring, not against you.** A sealed confidence is never sent
  to the browser, so it can't be read off the page — but the database is on your machine
  and you can always go and look. The reveal button exists so that the ordinary way of
  looking is recorded; opening the SQLite file isn't.
- **The synthetic recall values are deliberately weak.** Like the rest of the seed they are
  invented, so they were built to produce an inconclusive result rather than a dramatic
  one. Planting an effect and letting the app announce it would demonstrate nothing.
- **Local inference is weaker.** The privacy-preserving path is also the less capable
  one. The app is honest about which produced a given read rather than pretending the
  choice is free.
- **Appends are serialised in one process.** Computing the next hash means reading the
  current head, so two concurrent writers would chain from the same link. SQLite gives one
  writer per database and the app runs as a single process, which closes the gap here; a
  multi-process deployment would need that lock in the database.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Prisma + SQLite · Recharts ·
Gemini API · Vitest

Statistics: Wilson score intervals, Brier score, expected calibration error, a permutation
test for the hindsight spread. Integrity: SHA-256 hash chain over canonicalised events,
with the read model replayed and diffed against it.
