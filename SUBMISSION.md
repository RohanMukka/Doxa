# Devpost submission — copy/paste

Written against the Build Beyond submission checklist. Fill the two `[…]` prompts
before pasting; everything else is ready.

---

## Project Name

**Doxa**

Tagline: *A decision journal that shows you where your confidence lies to you.*

---

## Project Overview

### The Idea

Human memory rewrites itself. Once you know how something turned out, you
remember having been more certain — or less — in whichever direction makes you
look better. Psychologists call it hindsight bias, and you cannot introspect your
way past it, because the evidence you would introspect on is the thing that got
edited.

The known fix is a **decision journal**: write down the decision, your actual
reasoning, and how confident you are *before* you know the answer. Superforecasters
and investors use it seriously. Almost nobody has built decent software for it —
search for one and you find Notion templates.

But a journal alone only gives you a record. What I wanted was the thing that comes
after the record: **not "you were wrong about X", but "here is the pattern in how you
reason that keeps making you wrong."**

[Add one or two sentences here about the decision *you* got confidently wrong, and
what made you want this. A judge reads a hundred submissions; a real story in the
first paragraph is worth more than any feature list.]

### How It Works

1. **Log a decision before the outcome.** What you're deciding, your reasoning in
   your own words, a confidence percentage, and the date you'll know. One checkbox
   records whether you talked it through with anyone.
2. **Resolve it later.** When you find out, mark it right or wrong and note what
   actually happened.
3. **See the calibration.** Decisions get bucketed by stated confidence and plotted
   against how often you were actually right. A perfectly calibrated person's line
   sits on the diagonal; below it, you were more certain than the outcomes justified.
4. **Read the pattern.** An LLM pass reads every resolved entry — the reasoning text,
   the confidence, the outcome — alongside pre-computed statistics, and looks for what
   your miscalibration correlates with in *how you write*. Not a summary. A claim about
   your reasoning that you couldn't have made about yourself.

The interesting axis turned out to be whether anyone else saw your thinking first.
In the worked example, decisions reasoned through alone and decisions talked through
with someone carry almost the same stated confidence — and land very differently.

### Main Features

- **Calibration curve** with 95% Wilson intervals, so you can see how much the data
  actually supports. Buckets with too few decisions render hollow rather than
  pretending to be findings.
- **Proper scoring, not just a hit rate.** Brier score and expected calibration error
  sit alongside the headline gap. ECE matters because the intuitive number — mean
  confidence minus accuracy — *cancels*: being overconfident at one end of the scale
  and underconfident at the other averages out to "perfectly calibrated." There's a
  unit test pinning exactly that case.
- **The app refuses to overclaim.** If the gap sits inside the confidence interval,
  the headline says "leaning overconfident, but not yet past the noise" instead of
  asserting a number. A tool about overconfidence has no business being overconfident.
- **Alone vs. talked-through split**, shown as a dumbbell — the distance between what
  you said and what happened, per group.
- **LLM pattern analysis** prompted to cite specific numbers and quote real fragments
  from your entries, because the failure mode for this feature is generic
  fortune-cookie output.
- Accessible by construction: colorblind-safe palette (validated, not eyeballed),
  status never carried by color alone, every chart backed by a table.

### Technology Stack

- **Next.js 16** (App Router, Server Actions) + **React 19** + **TypeScript**
- **Tailwind CSS 4** for styling; custom design tokens with real dark-mode steps
- **Prisma 6** + **SQLite** — zero external services, clone and run
- **Recharts** for the calibration curve; hand-rolled SVG/CSS for the dumbbell
- **Google Gemini API** (`@google/genai`) with a declared response schema,
  re-validated with **Zod** server-side
- **Vitest** — 31 tests over the calibration maths
- Statistics: Wilson score intervals, Brier score, expected calibration error

### Intended Audience

Anyone who makes consequential decisions and suspects their confidence isn't earned —
students choosing between offers, people making money decisions, anyone who journals
and wants more than a diary. It assumes no statistics background: the metrics are
explained in plain language on the page.

It is deliberately single-user and local. Your decision journal contains the most
honest things you'll write about your own life, and that data staying on your machine
is a feature.

### Known limitations

Listing these because I'd rather name them than have them found.

- **Cold start is real.** Calibration needs resolved decisions, and decisions take
  months to resolve. A new user sees an empty dashboard and has to wait. The repo
  ships a seeded example journal so the analysis can be evaluated immediately, but
  that is a demo affordance, not a solution — building a genuine onboarding path
  (starting with fast-resolving predictions to bootstrap a baseline) is the next
  real piece of work.
- **The example journal is synthetic.** The seeded entries are written, not collected.
  They exist so the calibration and analysis features can be judged without waiting a
  year. Every number on screen is computed honestly from that data — but it is
  illustrative data.
- **Self-reported resolution.** You grade your own outcomes, which is exactly where
  motivated reasoning lives. Adjudication is an unsolved problem here.
- **Small samples.** At journal-sized n, most findings are directional. The app now
  says so on screen rather than hiding it, which is the honest half of the fix; the
  other half is just more data.

---

## Demo Materials

Screenshots in `docs/screenshots/`. [Add your demo video link here.]

### Video script (~90 seconds)

Record in light mode at 1280px. Do not start on the entry form — start on the payoff.

**0:00–0:12 — Open on the dashboard, already populated.**
> "This is a year of my decisions. Before each one, I wrote down my reasoning and how
> confident I was. This is what the record says about me."

**0:12–0:30 — Point at the headline and the two metric numbers.**
> "I said I was 73% confident on average. I was right 63% of the time. But notice what
> it *doesn't* say — it won't call that a verdict, because at 41 decisions that gap is
> still inside the noise. A tool about overconfidence shouldn't be overconfident."

**0:30–0:50 — Move to the calibration curve. Hover a point so the tooltip opens.**
> "Every decision, bucketed by how sure I was, against how often I was actually right.
> The dashed line is perfect calibration. The error bars are 95% intervals — and the
> hollow points are buckets with barely any decisions in them, so the app draws them
> as the guesses they are."

**0:50–1:10 — Move to the alone-vs-talked-through card. This is the turn.**
> "Here's the part I didn't expect. Split by whether I talked the decision through
> with anyone first. Same confidence, roughly. Completely different outcomes. Brier
> score nearly doubles when I reason alone."

**1:10–1:30 — Click "Find my patterns". Let it run. Read the sharpest insight aloud.**
> "And this reads the reasoning itself — not the numbers, the words I actually wrote —
> looking for what my overconfidence correlates with."

*(Read the strongest insight verbatim. Don't paraphrase it. If it names a phrase you
actually used, that's the moment the demo lands.)*

**1:30–1:40 — Cut to the entry form, fill one field, stop.**
> "Adding one takes fifteen seconds. The whole point is writing it down before you
> know the answer — because afterwards, you won't remember what you actually thought."

**If the analysis output is weak**, cut section 1:10–1:30 entirely and end on the
alone-vs-talked-through card. A tight 70-second video that lands beats a 90-second one
with a flat ending.

---

## Source Code

https://github.com/RohanMukka/Doxa

Run it locally:

```bash
npm install
cp .env.example .env    # add GEMINI_API_KEY (free, no card: aistudio.google.com/apikey)
npx prisma migrate dev
npm run seed
npm run dev
```

---

## Team Information

Solo submission — Rohan Mukka. Design, statistics, and implementation.
