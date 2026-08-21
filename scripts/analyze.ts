/**
 * Runs the pattern analysis from the command line and prints it, so you can
 * iterate on the prompt without clicking through the UI. The result is saved
 * like any other run, so `npm run capture:analysis` picks it up afterwards.
 *
 *   npm run analyze
 */
import { generateAnalysis } from "../src/lib/analysis";

async function main() {
  const t = Date.now();
  const insights = await generateAnalysis();
  console.log(`model: ${process.env.DOXA_MODEL ?? "gemini-3.6-flash"}  (${((Date.now() - t) / 1000).toFixed(1)}s)\n`);
  insights.forEach((i, n) => {
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
