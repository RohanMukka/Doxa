# Demo video recorder

`record.js` drives a real browser through a running Doxa build and records the session
to a `.webm`. The cut it produces is the demo video:
https://www.youtube.com/watch?v=KWQg262BTrE

`narration.json` is the spoken script, each line paired with the second of the recording
it should land on; `narrate.py` synthesises it, lays it on a silent track at those cues,
and muxes the result. Replacing the synthetic voice with a human read means recording
those lines against those timings.

Nothing here is a mock. It navigates the production server, types into the real entry
form, drags the real sliders, and clicks the real tamper simulator — so a change that
breaks the product breaks the recording, which is the point.

`overlay.js` is injected into every page and supplies the parts a browser does not
render on its own: a visible cursor with click ripples, the caption bar, the full-bleed
title cards, and eased scrolling.

## Running it

Playwright is not a project dependency — it is only needed to record, so install it
where you like:

```bash
npm install playwright        # or: npm i -D playwright
npx playwright install chromium
```

Then, with the app built and served:

```bash
npm run build
npx next start -p 3000 &
npm run seed                  # reset the journal to the demo dataset first
node scripts/demo-video/record.js
```

To lay the narration over it (needs `festival festvox-us-slt-hts ffmpeg`):

```bash
python3 scripts/demo-video/narrate.py scripts/demo-video/out/*.webm doxa-demo.mp4
```

The `.webm` lands in `scripts/demo-video/out/`, alongside a `timeline.json` recording
when each caption appeared — that clock is what `narration.json` cues against. Overrides: `OUT_DIR`, `DEMO_BASE_URL`,
`CHROMIUM_PATH`.

Re-seed before every take. The run appends a decision through the entry form, so a
second recording against the same database starts from a chain one block longer.
