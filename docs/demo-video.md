# Demo video

**File:** [`docs/doxa-demo.mp4`](./doxa-demo.mp4) — 1280×720, 2 min 57 s, narrated.

The cut is a real browser driving a real build: production Next.js server, the seeded
41-resolved / 6-open journal, and the actual SHA-256 chain. Nothing in it is mocked or
edited in afterwards. On-screen captions carry the argument, so it also works with the
sound off.

There is a shorter [78-second cut in the editorial light theme](./video/doxa-demo-light.webm),
silent, if the submission wants something under two minutes.

## Beat sheet

Times are exact — `record.js` logs them as it records.

| Time | Beat |
|------|------|
| 0:02 | Title card |
| 0:06 | The problem: you do not remember how sure you were |
| 0:12 | Dashboard — 41 decisions written down before the outcome was known |
| 0:17 | 73% stated confidence against 63% accuracy · 17 pts calibration error · Brier 0.225 |
| 0:23 | The calibration curve: fitted posterior with its 95% credible band |
| 0:27 | The anchor table — say 90%, right about 79% of the time |
| 0:33 | The read — the pattern found in the reasoning text rather than the numbers |
| 0:39 | "Your certainty is highest exactly where you skip outside input" |
| 0:45 | Logging a decision: the reasoning, and what would make it wrong, frozen now |
| 1:04 | The confidence slider crossing the 85% threshold |
| 1:11 | Doxa refuses to take the entry |
| 1:18 | The interrogation: a historical failure analogue at the same certainty |
| 1:23 | The exact phrase quoted back out of what was just typed |
| 1:27 | Defend, proceed, or take the empirical median |
| 1:35 | The entry lands in the journal, appended to the chain |
| 1:41 | Counterfactual sandbox — a hypothetical shift on the decisions made alone |
| 1:53 | Brier, miscalibration and discrimination recomputed live |
| 1:58 | The credible band morphing with the shift |
| 2:04 | The SHA-256 audit trail — 119 blocks, SEALED, verified client-side |
| 2:17 | Block detail: pre-image, previous hash, payload digest |
| 2:22 | Tamper simulator — an outcome flipped in SQLite |
| 2:32 | The chain breaking at the mutated block, and every block after it |
| 2:47 | Restored — 100% sealed |
| 2:51 | Close card |

## Narration

The voiceover is synthesised offline (Festival's HTS voice) and cut to the beats above
rather than read over them — see [`scripts/demo-video/narrate.py`](../scripts/demo-video/narrate.py)
and [`narration.json`](../scripts/demo-video/narration.json), which holds each line with
the second it should land on.

To replace it with a human read, the lines in `narration.json` are the script, and their
cue times are the timings to hit. Record against the silent cut and mux:

```bash
ffmpeg -i silent.mp4 -i your-voice.wav -c:v copy -c:a aac -shortest narrated.mp4
```

## Re-recording

```bash
npm run build && npx next start -p 3000   # in another terminal
npm run seed                              # reset the journal to the demo dataset
node scripts/demo-video/record.js         # writes the webm and timeline.json
python3 scripts/demo-video/narrate.py scripts/demo-video/out/*.webm docs/doxa-demo.mp4
```

Re-seed before every take: the run appends a decision through the entry form, so a second
recording against the same database starts from a chain one block longer.
