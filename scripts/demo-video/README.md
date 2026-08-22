# Demo video recorder

`record.js` drives a real browser through a running Doxa build and records the session
to a `.webm`. The cut it produces is [`docs/doxa-demo.webm`](../../docs/doxa-demo.webm);
the beat sheet and voiceover script live in [`docs/demo-video.md`](../../docs/demo-video.md).

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

The `.webm` lands in `scripts/demo-video/out/`. Overrides: `OUT_DIR`, `DEMO_BASE_URL`,
`CHROMIUM_PATH`.

Re-seed before every take. The run appends a decision through the entry form, so a
second recording against the same database starts from a chain one block longer.
