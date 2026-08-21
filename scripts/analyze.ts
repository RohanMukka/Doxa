/**
 * Runs the pattern analysis from the command line and prints it, so you can
 * iterate on the prompt without clicking through the UI. The result is saved
 * like any other run, so `npm run capture:analysis` picks it up afterwards.
 *
 *   npm run analyze            # runs on a local model
 *   npm run analyze -- --cloud # sends every resolved entry to Google
 */
import { generateAnalysis } from "../src/lib/analysis";

async function main() {
  // Consent is an argument you have to type. There is deliberately no env var
  // for it: a value you set once and forget is not a decision about this run.
  const cloud = process.argv.includes("--cloud");

  const t = Date.now();
  const run = await generateAnalysis(cloud);

  console.log(
    `${run.backend} · ${run.model} · ${run.ranLocally ? "nothing left this machine" : "sent off this machine"}` +
      `  (${((Date.now() - t) / 1000).toFixed(1)}s)\n`
  );

  run.insights.forEach((i, n) => {
    console.log(`── ${n + 1} ─────────────────────────────────────────`);
    console.log(`HEADLINE: ${i.headline}\n`);
    console.log(`EVIDENCE: ${i.evidence}\n`);
    console.log(`TRY:      ${i.tryInstead}\n`);
  });
}

main()
  .catch((e) => {
    console.error("FAILED:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
