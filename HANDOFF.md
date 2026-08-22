# Doxa — handoff for the next agent

Written for an AI agent picking this up cold. Read this before changing anything.

---

## 0. Read this first: the clock

The Build Beyond deadline is **Aug 22, 2026 @ 01:45 CDT**. As of writing there are
roughly **2.5 hours left**.

**Do not start new architecture.** The project is feature-complete and in good
shape. In the time remaining, the only things that move the score are:

1. ~~**A demo video.**~~ Done — `docs/doxa-demo.mp4`, 2:57, narrated. Generated
   by `scripts/demo-video/`, which drives a real browser through the running
   build, so it can be re-recorded after any change. The synthetic voice is the
   one soft spot: `scripts/demo-video/narration.json` is the script with cue
   times already proven to fit, if a human read replaces it.
2. **Filling the `[…]` placeholders in `SUBMISSION.md`** — there is at least one
   prompt asking for a real personal story, which is the pitch's emotional hook.
3. **A live/hosted demo URL**, if one can be stood up quickly. Judges will not
   `npm install`. (Note: SQLite + local writes means this needs Postgres/Turso —
   probably too big a change now. Skip if it can't be done safely.)
4. Small polish and copy fixes.

Anything that risks breaking `npm run build`, `npm test` or `npm run verify` in
the last two hours is a bad trade. **Verify before you commit** (see §7).

---

## 1. What Doxa is

A **decision journal that measures the gap between how confident you were and how
often you were right** — and then refuses to overclaim about what it found.

You log a decision *before* you know the outcome: what you're deciding, your real
reasoning, a confidence percentage, and — required — **what would make you
wrong**. Later you record what happened. The app then tells you where your
certainty and your accuracy come apart.

**The governing design principle, which every part of the codebase obeys:**

> A tool about overconfidence has no business being overconfident.

This is not a slogan bolted on afterwards. It is why the statistics are Bayesian,
why the AI's claims are tested out-of-sample, why failures are shown on screen,
and why several features report "not yet" instead of a number. **If you change
something so the app claims more than the data supports, you have broken the
product, even if the code works.**

- Repo: `https://github.com/RohanMukka/Doxa`
- Branch: **`main`** (work directly on it — see §7)
- Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 ·
  Prisma 6 + SQLite · Recharts · Zod · Vitest
- Single-user, local-first. No auth. No multi-tenancy.

---

## 2. Run it

```bash
npm install
cp .env.example .env          # no key needed to run
npx prisma migrate dev        # creates prisma/dev.db
npm run seed                  # loads the demo journal (~46 entries)
npm run dev                   # http://localhost:3000
```

Full script list:

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Vitest — **246 tests**, all pure, no DB or network |
| `npm run lint` | ESLint (currently 0 errors, 10 warnings) |
| `npm run seed` | Rebuilds the journal **through the event log** |
| `npm run verify` | Walks the hash chain + replays the log against the table |
| `npm run resolve` | Settles decisions whose machine-checkable criterion is due |
| `npm run analyze` | Pattern analysis from the CLI (`-- --cloud` to use Gemini) |
| `npm run capture:analysis` | Freezes a real analysis run into `prisma/seed-analysis.json` |
| `npm run models` | Lists Gemini models your key can reach |

**Routes:** `/` (dashboard) · `/journal` · `/journal/new` · `/verify`
(cryptographic auditor) · `/pitch` (pitch deck) · `/api/export?format=json|csv`

---

## 3. Non-negotiable invariants

These are the things that will silently break the product if violated. Most are
not obvious from reading a single file.

### 3.1 Never write to `Entry` directly

`Entry` is a **projection**. The source of truth is the append-only, hash-chained
`Event` table.

```ts
// ✅ the only sanctioned write path
import { append } from "@/lib/journal/log";
await append([{ type: "DecisionMade", entryId, payload: { ... } }]);

// ❌ this will be caught by `npm run verify` as projection drift
await prisma.entry.update({ ... });
```

`npm run verify` runs two independent checks and **both must pass**:
- **Chain integrity** — every event's stored hash equals the hash of its contents
  plus its predecessor. Catches an edited payload, a deleted event, a reorder.
- **Projection drift** — replaying the whole log must reproduce the `Entry` table
  exactly. Catches anything that wrote to `Entry` around the log.

This was verified by actually attacking it: editing a row is caught as drift;
editing the event *and* the row to match is caught as a chain break at a named
`seq`.

### 3.2 Changing an event payload shape invalidates every existing chain

Event payloads are hashed. If you add/remove/rename a field in
`src/lib/journal/events.ts`, **all previously stored hashes become wrong**.

After any such change you must run `npm run seed` (which rebuilds the log from
scratch) and then `npm run verify`. There is no migration path for existing
chains — this is a known and accepted limitation of a single-user local tool.

### 3.3 `canonicalize` rejects `Date`

`src/lib/journal/events.ts` hashes a canonical JSON encoding: keys sorted,
`-0` normalised, `undefined` omitted, and **`Date` throws deliberately**. Payloads
must carry ISO strings, so a digest can never depend on the writer's timezone.

The hash preimage JSON-encodes every variable-length field so a newline inside a
value cannot forge a field boundary. Don't "simplify" this back to a plain join.

### 3.4 Client components must not import Prisma

This already caused a hard Turbopack panic
(`the chunking context does not support external modules (request: node:module)`).

The fix pattern is in place and should be followed:
- `src/lib/priors.ts` — **pure** types + lookups, safe for client components
- `src/lib/priors-query.ts` — the DB query, server-only

If you add a lib that a `"use client"` component needs, split it the same way.

### 3.5 Appends are serialised in-process

Computing the next hash requires reading the current head, so two concurrent
writers would chain from the same link. `log.ts` holds an in-process promise
queue; SQLite gives one writer per DB. This closes the gap for the single process
the app runs as. **A multi-process deployment would need that lock in the
database.** Don't deploy this to serverless without addressing it.

---

## 4. Module map

### The journal core — `src/lib/journal/`
| File | Role |
|---|---|
| `events.ts` | Event types, canonical JSON, hash preimage, chain. **Pure.** |
| `project.ts` | Fold from events → `EntryState`. Rejects invalid transitions. **Pure.** |
| `log.ts` | `append()`, `readLog()`, projection writes. The only write path. |
| `verify.ts` | `checkChain` + `checkProjection` → `verifyJournal()` |
| `client-verify.ts` | Browser-side re-verification (WebCrypto) for `/verify` |

**Event types:** `DecisionMade`, `ConfidenceRecalled`, `OutcomeRecorded`,
`ConfidenceRevealed`.

### Statistics
| File | Role |
|---|---|
| `calibration.ts` | Wilson intervals, Brier, ECE, hindsight + permutation test |
| `recalibration.ts` | **Grid-fitted Bayesian model** `P(correct\|p) = σ(a·logit(p)+b)` |
| `discrimination.ts` | Murphy decomposition + AUC with a non-degenerate interval |
| `pooling.ts` | Partial pooling of per-category rates (fitted shrinkage) |
| `experiment.ts` | The randomised premortem trial |
| `adjudication.ts` | Self-graded vs externally-graded comparison |

### The hypothesis engine — `src/lib/hypotheses/`
| File | Role |
|---|---|
| `features.ts` | Deterministic writing features (hedging, absolutes, …) |
| `predicate.ts` | Machine-checkable filter language + `describe()` |
| `validate.ts` | Out-of-sample test, permutation p, Benjamini–Hochberg |
| `enumerate.ts` | Mechanical candidate sweep (needs no model) |
| `propose.ts` | LLM proposal prompt + parsing (training window only) |
| `run.ts` | Orchestrates propose → test → correct → record |

### Inference — `src/lib/inference/`
Pluggable backends. `ollama.ts` (local, default) and `gemini.ts` (cloud).
`chooseBackend()` in `index.ts` enforces the privacy rule (§5.2).

### Resolvers — `src/lib/resolvers/`
`spec.ts` (types, SSRF guard, `describeResolver`) · `check.ts` (the three kinds,
injected fetcher) · `run.ts` (`resolveDue`).

---

## 5. Behavioural rules that look like bugs but aren't

If you "fix" any of these, you have made the product worse.

### 5.1 Statistics deliberately refuse to conclude

- The recalibration prior is centred on **perfect calibration**, not on the
  population tendency to be overconfident. Centring it where the literature sits
  would make the app likelier to announce a finding it was always going to
  announce.
- On the seeded journal the model fits `a = 0.65` (over-extremity) but the
  interval `[0.13, 1.23]` contains 1, so it reports the user as
  **indistinguishable from calibrated**. That is correct at n=41.
- The AUC interval is **not a bootstrap**. Under perfect separation every
  resample also separates, so bootstrap intervals collapse to `[1, 1]` and four
  cleanly-sorted decisions would read as proven skill. It uses a Wilson interval
  over the smaller outcome group instead. Don't switch it back.
- All permutation tests are **seeded** so a p-value doesn't move between renders,
  and use add-one on both tails so p is never 0.

### 5.2 The cloud model is never reached by accident

`chooseBackend()` enforces one rule: **Gemini is never selected by default, by
fallback, or because no local model exists.** It is reachable only with explicit
per-run consent.

- `runAnalysis()` — local only; errors rather than falling back
- `runAnalysisOnCloud()` — separate server action behind its own button
- CLI: `npm run analyze -- --cloud` (a flag you type; deliberately no env var)
- Even `DOXA_INFERENCE="cloud"` still asks — choosing a backend in config is not
  the same act as consenting to send your journal off the machine.

The footer copy was corrected because the old claim ("Doxa keeps everything on
this machine") was false while the analysis posted every entry to Google. **Don't
reintroduce a sweeping privacy claim.**

### 5.3 The hypothesis ledger shows its failures

On the seeded journal: **11 claims tested, 0 held, 6 failed, 5 untestable.**

This is correct, not broken. With a 12-decision holdout only a very large effect
could clear the bar, and the card says so. Among the failures is the
alone-vs-talked-through split that the insights panel presents as a
"33-percentage-point collapse" — out of sample it returns **p = 0.21**.

**The dashboard contradicting its own headline finding is the single most
valuable thing this project does.** Do not hide it.

### 5.4 Several cards say "not yet" on a fresh clone

- **"Does the premortem help?"** — the trial hasn't started. Every seeded entry
  predates the experiment and belongs to **neither arm** (`premortemAssigned:
  null`). Marking them as controls would stack the comparison with a year of
  decisions the intervention was never withheld from.
- **"Who graded it"** — until you run `npm run resolve`.

These empty states are load-bearing honesty, not unfinished work.

### 5.5 Confidence is sealed while a decision is open

The stated confidence is **not sent to the browser** for open entries. At
resolution you're asked to recall it first; the number only arrives after the
recall is committed to the log (a server round-trip, not client state). Revealing
early is allowed but logged, and disqualifies that entry from the hindsight
statistics — decided server-side from the log, never from what the form claims.

---

## 6. What is deliberately synthetic (the honesty ledger)

State this accurately if you write submission copy. Overstating it is the fastest
way to lose a judge's trust.

| Thing | Status |
|---|---|
| The 41 resolved + 5 open seeded entries | **Invented.** Hand-written, not collected. |
| Seeded recalled confidences | **Invented, and deliberately weak** — a few points of drift against nine of noise, so the hindsight card reports p = 0.09 and declines to claim. Planting a dramatic effect would prove nothing. |
| `prisma/seed-analysis.json` | **A real Gemini run**, captured and committed. Labelled as a hosted run in the UI. |
| The hypothesis ledger results | **Really computed** from the seeded journal by the same code the app runs. |
| The one machine-settled outcome | **Genuinely external.** `npm run resolve` asks the npm registry whether Prisma is still on 6.x, finds `7.9.1`, and marks the prediction wrong. Nobody in this repo decided that. |

---

## 7. Conventions (from `CLAUDE.md`)

- **Work on `main`.** Don't open a side branch unless asked.
- **Commit as `Rohan Mukka <rohanmukka09@gmail.com>`** — author *and* committer.
  Set it if the environment hasn't:
  ```bash
  git config user.name "Rohan Mukka" && git config user.email "rohanmukka09@gmail.com"
  ```
- **No trailers.** No `Co-Authored-By`, no session links, no tool attribution.
- **Several small commits over one large one.** Each should typecheck, lint and
  pass `npm test` on its own.
- **Run `npm run verify` before committing anything touching the journal.**

Pre-commit checklist:

```bash
npx tsc --noEmit    # ignore PageProps/LayoutProps errors — Next generates those at build
npm run lint
npm test
npm run verify
npm run build
```

---

## 8. Known issues and open items

**Resolved:** the dashboard rendered neither `CalibrationChart` nor
`CalibrationFan` while computing `band` and `anchors` on every request. The fan
is back, directly under the headline, on the reasoning that a claim about the
whole curve should be shown the curve; the `CalibrationChart` import went with
it, since the fan already draws the buckets it plotted. That cleared six of the
eleven ESLint warnings. Five remain, all genuinely unused bindings.

**Other open items:**
- **`SUBMISSION.md` has unfilled `[…]` placeholders.**
- **No hosted demo.** SQLite + local writes; would need Postgres/Turso.
- **Ollama path is unexercised.** The selection logic is fully tested, but the
  actual HTTP request/response handling has never run against a live Ollama.
  Worth one real run before claiming it works.
- **`client-verify.ts` starts with a UTF-8 BOM.** Harmless, tidy if convenient.
- **The premortem gate can be bypassed** by a determined user (assignment travels
  with the form). Documented; it only means opting out of your own experiment.
- **Chain migration.** Changing event payloads requires a full reseed (§3.2).

---

## 9. If you have time after the deadline items

In rough order of value, all previously scoped but not built:

1. **Resolver-backed starter predictions** on the cold-start screen, so a new
   user gets machine-graded entries in their first fortnight rather than having
   to invent one.
2. **An evaluation harness for the insight generator** — a labelled set plus an
   LLM-judge rubric, so groundedness and specificity can be *measured* rather
   than asserted.
3. **Prequential (rolling-origin) validation** to extract more signal from small
   n than a single time-ordered split does.
4. **Goodhart detection** — a discontinuity in the fitted `(a, b)` right after
   the user first views the dashboard, with no change in discrimination, would
   indicate they're shading their numbers rather than reasoning better.
5. **Import from Manifold/Metaculus** — real, market-resolved predictions. Kills
   the synthetic-data critique outright, but those records carry no reasoning
   text, which starves the feature the project is proudest of.

---

## 10. Voice

The prose in this app is doing real work and is unusually consistent. If you
write copy, match it:

- Plain, declarative, unhedged. Short sentences.
- It states limitations **before** a judge finds them. "That is the honest
  outcome at this size, not a broken feature."
- It never congratulates the user, and never uses the word "insights" as a
  selling point.
- Comments in code explain **why**, especially why an obvious alternative was
  rejected — the bootstrap in `discrimination.ts` is the model for this.
- British-ish spelling appears in places (`generalise`, `randomise`). Not
  worth normalising now.
