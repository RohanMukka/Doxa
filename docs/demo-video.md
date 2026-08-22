# Demo video

**File:** [`docs/doxa-demo.webm`](./doxa-demo.webm) — 1280×720, 2 min 48 s, silent.

The cut is a real browser driving a real build: production Next.js server, the seeded
41-resolved / 6-open journal, and the actual SHA-256 chain. Nothing in it is mocked or
edited in afterwards. On-screen captions carry the argument, so the video works with
the sound off — the voiceover below is optional and additive.

## What it shows, in order

| Time | Beat |
|------|------|
| 0:00 | Title card |
| 0:05 | The problem: you do not remember how sure you were |
| 0:13 | Dashboard — 41 decisions, 73% stated confidence against 63% accuracy, 17 pts calibration error, Brier 0.225 |
| 0:23 | The read — the pattern the model found in the reasoning text, not the numbers |
| 0:36 | Logging a decision: what you're deciding, why, and what would make you wrong |
| 0:55 | The confidence slider dragged past the 85% threshold |
| 1:05 | The adversarial interrogation — historical failure analogue, the exact phrase quoted back, recalibrate to the empirical median |
| 1:22 | The entry lands in the journal, appended to the chain |
| 1:36 | Counterfactual sandbox — a hypothetical −14% shift, Brier and Murphy decomposition recomputed live, credible band morphing |
| 1:57 | The SHA-256 audit trail — 119 blocks, SEALED, verified client-side with Web Crypto |
| 2:15 | Tamper simulator: an outcome flipped in SQLite, the chain breaking at the mutated block |
| 2:40 | Restored — 100% sealed |
| 2:45 | Close card |

## Voiceover script

Roughly 150 wpm. Every line is optional; the captions already say the essential thing.
Leave the pauses — the interrogation modal and the broken chain both want a beat of
silence to land.

**0:00–0:11 — title and problem cards**
> Once you know how something turned out, you stop being able to remember how sure you
> were before it. Memory edits the number, quietly, in whichever direction flatters you.

**0:13–0:23 — dashboard**
> This is forty-one decisions, each written down before the outcome was known. On
> average I said I was seventy-three percent sure. I was right sixty-three percent of
> the time.

*(beat)*

> And notice what the app refuses to do with that. At this sample size it says the gap
> is still inside what chance would produce. A tool about overconfidence has no business
> being overconfident.

**0:23–0:36 — the read**
> This part reads the entries themselves — the words, not the numbers — and looks for
> what the miscalibration correlates with. It found that my certainty is highest exactly
> where I skip outside input. A thirty-three point accuracy collapse.

**0:36–0:55 — logging a decision**
> So here's a new one. The decision, my actual reasoning, and — required — what would
> make me wrong, written now and frozen, before I have any incentive to move it.

**0:55–1:05 — the slider**
> The slider warms from green to amber to red as certainty climbs. At eighty-five
> percent, something happens.

**1:05–1:22 — the interrogation**
> Doxa refuses to just take the entry. It goes back through the resolved journal, finds
> a decision where I was this certain and wrong, and quotes the exact phrase in what I
> just wrote that it recognised.

*(beat — let the modal read)*

> I can defend the stance, and the defence gets stored as a preregistered premortem. I
> can proceed anyway. Or I can take my own empirical median — eighty-one, not
> ninety-two.

**1:22–1:36 — the journal**
> Either way it's appended to a hash chain, and it cannot be quietly edited afterwards.

**1:36–1:57 — the sandbox**
> The sandbox asks the counterfactual. What if I'd deflated the decisions I made alone
> by fourteen points? Brier score, miscalibration, discrimination — all recomputed in
> the browser, sixty frames a second, and the ninety-five percent credible band moves
> with it.

**1:57–2:15 — the audit trail**
> Every decision, every confidence recall, every resolution is one hashed event, chained
> to the one before it. Your browser verifies the whole chain with Web Crypto — you
> don't take my word for it.

**2:15–2:40 — the tamper simulator**
> So let's forge the record. Go back and flip an outcome I got wrong.

*(beat)*

> The chain breaks at the mutated block, and at every block after it. Hindsight
> forgery is detectable, not merely discouraged.

**2:40–2:48 — restore and close**
> Which makes "I wrote this down beforehand" something the file can prove.

## Re-recording it

The video is generated, not hand-captured — see [`scripts/demo-video/`](../scripts/demo-video).
Reproduce it with:

```bash
npm run build && npx next start -p 3000   # a fresh terminal
npm run seed                              # reset the journal to the demo dataset
node scripts/demo-video/record.js         # writes a .webm next to the script
```
