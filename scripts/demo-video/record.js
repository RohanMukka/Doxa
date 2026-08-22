const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.DEMO_BASE_URL || 'http://localhost:3000';
const OUT = process.env.OUT_DIR || path.join(__dirname, 'out');
const OVERLAY = fs.readFileSync(path.join(__dirname, 'overlay.js'), 'utf8');

fs.mkdirSync(OUT, { recursive: true });

// Playwright resolves its own download unless the environment already pins one.
const BUNDLED = '/opt/pw-browsers/chromium';
const EXECUTABLE = process.env.CHROMIUM_PATH || (fs.existsSync(BUNDLED) ? BUNDLED : undefined);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const CARD = (kicker, title, body, foot) => `
  <div style="font-family:var(--font-geist-mono),ui-monospace,monospace;font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#52525b;">${kicker}</div>
  <div style="margin-top:22px;font-family:var(--font-newsreader),Georgia,serif;font-size:64px;line-height:1.06;letter-spacing:-.02em;color:#fafafa;max-width:1050px;">${title}</div>
  <div style="margin-top:26px;font-family:var(--font-geist-sans),system-ui,sans-serif;font-size:19px;line-height:1.6;color:#a1a1aa;max-width:760px;">${body}</div>
  ${foot ? `<div style="margin-top:34px;font-family:var(--font-geist-mono),ui-monospace,monospace;font-size:12.5px;letter-spacing:.14em;color:#52525b;">${foot}</div>` : ''}
`;

async function install(page) {
  await page.evaluate(OVERLAY);
  await page.evaluate(() => window.__d.install());
}

async function go(page, url) {
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  await install(page);
}

async function cap(page, main, sub) {
  await page.evaluate(([m, s]) => window.__d.caption(m, s), [main, sub || '']);
}
const hideCap = (page) => page.evaluate(() => window.__d.hideCaption());
const card = (page, html) => page.evaluate((h) => window.__d.showCard(h), html);
const hideCard = (page) => page.evaluate(() => window.__d.hideCard());
const scrollY = (page, y, d) => page.evaluate(([y, d]) => window.__d.scrollTo(y, d), [y, d]);
const scrollText = (page, t, d, o) => page.evaluate(([t, d, o]) => window.__d.scrollToText(t, d, o), [t, d, o]);
const glow = (page, t) => page.evaluate((t) => window.__d.glow(t), t);
const capPos = (page, w) => page.evaluate((w) => window.__d.captionPos(w), w);

// Bring an element comfortably into frame with an eased scroll, not a jump.
async function bringIntoView(page, locator, targetFrac = 0.45) {
  const handle = await locator.elementHandle();
  if (!handle) return;
  const info = await page.evaluate(([el, frac]) => {
    const r = el.getBoundingClientRect();
    const want = window.innerHeight * frac - r.height / 2;
    const delta = r.top - want;
    if (Math.abs(delta) < 60) return null;
    return Math.max(0, window.scrollY + delta);
  }, [handle, targetFrac]);
  if (info != null) {
    await scrollY(page, info, 900);
    await wait(1000);
  }
}

// Move the fake cursor to an element and click it, with human-ish easing.
async function clickAt(page, locator, opts = {}) {
  if (opts.scroll !== false) await bringIntoView(page, locator, opts.frac);
  const box = await locator.boundingBox();
  if (!box) throw new Error('no box for ' + locator);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y, { steps: opts.steps || 28 });
  await wait(opts.pause == null ? 550 : opts.pause);
  await page.mouse.click(x, y);
}

// Drag a range input's thumb to a target value the way a person would, then
// nudge with the arrow keys if the pixel maths landed a step or two off.
async function dragRange(page, locator, target) {
  await bringIntoView(page, locator);
  const box = await locator.boundingBox();
  const min = Number(await locator.getAttribute('min') ?? 0);
  const max = Number(await locator.getAttribute('max') ?? 100);
  const current = Number(await locator.inputValue());
  const xFor = (v) => box.x + 8 + ((v - min) / (max - min)) * (box.width - 16);
  const y = box.y + box.height / 2;

  await page.mouse.move(xFor(current), y, { steps: 24 });
  await wait(450);
  await page.mouse.down();
  const steps = 34;
  for (let i = 1; i <= steps; i++) {
    const v = current + ((target - current) * i) / steps;
    await page.mouse.move(xFor(v), y);
    await wait(26);
  }
  await page.mouse.up();
  await wait(350);

  let value = Number(await locator.inputValue());
  let guard = 0;
  while (value !== target && guard++ < 40) {
    await page.keyboard.press(value < target ? 'ArrowRight' : 'ArrowLeft');
    await wait(70);
    value = Number(await locator.inputValue());
  }
  return value;
}

async function typeInto(page, locator, text, delay = 26) {
  await clickAt(page, locator, { pause: 250 });
  await locator.pressSequentially(text, { delay });
}

(async () => {
  const browser = await chromium.launch({
    executablePath: EXECUTABLE,
    args: ['--force-color-profile=srgb', '--font-render-hinting=none', '--hide-scrollbars'],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  // ─────────────────────────────────────────── SCENE 0 · title
  await go(page, '/');
  await card(page, CARD(
    'Build Beyond Hackathon',
    'Doxa',
    'A tamper-evident decision journal that measures the gap between how sure you were and how often you were right.',
    'SHA-256 HASH CHAIN &nbsp;·&nbsp; BAYESIAN RECALIBRATION &nbsp;·&nbsp; LOCAL-FIRST'
  ));
  await wait(5000);

  await card(page, CARD(
    'The problem',
    'You do not remember how&nbsp;sure you were.',
    'Once you know the answer, memory quietly rewrites the confidence you had before it — in whichever direction flatters you. You cannot introspect past it, because the evidence you would introspect on is the thing that got edited.',
    ''
  ));
  await wait(5600);
  await hideCard(page);
  await wait(900);

  // ─────────────────────────────────────────── SCENE 1 · dashboard
  await cap(page, 'Forty-one decisions, each written down <em>before</em> the outcome was known.', 'Dashboard · doxa');
  await wait(3600);
  await scrollY(page, 220, 1800);
  await cap(page, '73% sure on average. Right 63% of the time.', 'Calibration error · 17 pts · Brier 0.225');
  await wait(4000);
  await hideCap(page);

  // ─────────────────────────────────────────── SCENE 2 · the read
  await scrollText(page, 'What your reasoning keeps doing', 2000, 90);
  await cap(page, 'A model reads every entry — your words, your certainty, your outcome — and names the pattern.', 'The read');
  await wait(3600);
  await scrollY(page, await page.evaluate(() => window.scrollY + 240), 1500);
  await cap(page, '“Your certainty is highest exactly where you skip outside input.”', '33-point accuracy collapse · testable claim, not a summary');
  await wait(4500);
  await hideCap(page);
  await wait(700);

  // ─────────────────────────────────────────── SCENE 3 · log a decision + interrogation
  await go(page, '/journal/new');
  await cap(page, 'Logging a new decision.', 'Reasoning, confidence, and what would make you wrong');
  await wait(2600);
  await hideCap(page);

  await typeInto(page, page.locator('textarea[name="decision"]'),
    'Ship the new pricing page before the end of the quarter.', 22);
  await wait(500);
  await typeInto(page, page.locator('textarea[name="reasoning"]'),
    "I've read the analytics myself and the funnel is obvious. I don't need to run this past the growth team — I already know what they'll say.", 16);
  await wait(500);
  await typeInto(page, page.locator('textarea[name="falsifier"]'),
    'Conversion is flat or down 30 days after launch.', 22);
  await wait(700);

  await cap(page, 'The confidence slider runs emerald → amber → rose as certainty climbs.', 'Threshold: 85%');
  const slider = page.locator('input[name="confidence"]');
  const landed = await dragRange(page, slider, 92);
  if (landed !== 92) throw new Error('confidence landed at ' + landed);
  await wait(1800);
  await cap(page, 'Past 85%, Doxa refuses to just take the entry.', 'Adversarial interrogation');
  await wait(2600);
  await hideCap(page);

  await clickAt(page, page.locator('button:has-text("Save entry")'), { pause: 700 });
  await page.waitForSelector('text=The Challenge', { timeout: 20000 });
  await capPos(page, 'top');
  await wait(1600);
  await cap(page, 'It finds a resolved decision where you were <em>this</em> certain — and wrong.', 'Historical journal analogue');
  await wait(4500);
  await cap(page, 'Then it quotes the exact phrase in what you just wrote that it recognised.', 'Semantic quote attribution');
  await wait(4100);
  await cap(page, 'Defend the stance, proceed anyway — or take the empirical median.', 'Three ways out, all recorded');
  await wait(3600);
  await hideCap(page);

  const recal = page.locator('button:has-text("Recalibrate to")');
  await clickAt(page, recal, { pause: 900, scroll: false });
  await capPos(page, 'bottom');
  await page.waitForURL('**/journal', { timeout: 25000 });
  await install(page);
  await wait(1200);
  await cap(page, 'Appended to the chain. It cannot be quietly edited later.', 'Journal');
  await wait(3200);
  await hideCap(page);

  // ─────────────────────────────────────────── SCENE 4 · counterfactual sandbox
  await go(page, '/');
  await scrollText(page, 'Counterfactual Sandbox', 2200, 110);
  await cap(page, 'The sandbox asks the counterfactual: what if you had been less sure?', 'Bayesian recalibration laboratory');
  await wait(3600);
  await hideCap(page);

  const shift = page.locator('#counterfactual-adjustment');
  await dragRange(page, shift, -14);
  await wait(1400);
  await cap(page, 'Brier score, miscalibration and discrimination — recomputed live, in the browser.', 'Murphy decomposition · 60fps');
  await wait(4000);
  await scrollY(page, await page.evaluate(() => window.scrollY + 300), 1600);
  await cap(page, 'The 95% credible band morphs with it. No server round-trip.', 'Calibration fan · grid-fitted posterior');
  await wait(4000);
  await hideCap(page);
  await wait(600);

  // ─────────────────────────────────────────── SCENE 5 · the auditor
  await go(page, '/verify');
  await cap(page, 'Every decision, recall and resolution is one hashed event, chained to the one before it.', 'The SHA-256 audit trail');
  await wait(4100);
  await scrollY(page, 300, 1600);
  await cap(page, 'Verified in the browser with Web Crypto — not on our word.', 'Status: SEALED');
  await wait(3600);
  await hideCap(page);

  await scrollY(page, 640, 1400);
  const firstBlock = page.locator('button:has-text("Inspect")').first();
  if (await firstBlock.count()) {
    await clickAt(page, firstBlock, { pause: 600 });
    await wait(1200);
    await cap(page, 'Pre-image, previous hash, payload digest — all of it inspectable.', 'Block detail');
    await wait(4000);
    await hideCap(page);
  }

  await scrollY(page, 300, 1200);
  await cap(page, 'So: forge the record. Go back and flip an outcome you got wrong.', 'Tamper simulator');
  await wait(3200);
  await hideCap(page);
  await clickAt(page, page.locator('button:has-text("Flip Outcome")'), { pause: 900 });
  await wait(1600);
  await scrollY(page, 0, 1200);
  await cap(page, 'The chain breaks at the mutated block, and every block after it.', 'Tamper detected · hash mismatch');
  await wait(4500);
  await hideCap(page);
  await scrollY(page, 620, 1500);
  await wait(1800);
  await scrollY(page, 0, 1200);
  const reset = page.locator('button:has-text("Restore Chain Integrity")');
  if (await reset.count()) {
    await clickAt(page, reset, { pause: 800 });
    await wait(1600);
    await cap(page, '“I wrote this down beforehand” becomes something the file can prove.', 'Restored · 100% sealed');
    await wait(4000);
    await hideCap(page);
  }
  await wait(800);

  // ─────────────────────────────────────────── SCENE 6 · close
  await card(page, CARD(
    'Doxa',
    'Stop trusting the version of&nbsp;you that already knows the&nbsp;answer.',
    'Next.js 16 · React 19 · Prisma + SQLite · SHA-256 hash chain · Web Crypto verification · grid-fitted Bayesian recalibration · local-first LLM analysis. 246 tests.',
    'GITHUB.COM/ROHANMUKKA/DOXA'
  ));
  await wait(6000);

  await context.close();
  await browser.close();
  console.log('Recorded to ' + OUT);
})().catch((e) => { console.error(e); process.exit(1); });
