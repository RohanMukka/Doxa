/**
 * Captures the most recent analysis run into a committed JSON file, so a fresh
 * clone can seed a dashboard that already shows real model output instead of
 * an empty panel.
 *
 * Run this after you've generated an analysis you're happy with:
 *   npm run capture:analysis
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();
const OUT = path.join(process.cwd(), "prisma", "seed-analysis.json");

async function main() {
  const latest = await prisma.analysis.findFirst({ orderBy: { createdAt: "desc" } });

  if (!latest) {
    console.error(
      "No analysis found. Run one from the dashboard first (needs ANTHROPIC_API_KEY), then re-run this."
    );
    process.exit(1);
  }

  const insights = JSON.parse(latest.insights);
  fs.writeFileSync(
    OUT,
    JSON.stringify({ insights, entriesAnalyzed: latest.entriesAnalyzed }, null, 2) + "\n"
  );

  console.log(
    `Captured ${insights.length} insights from ${latest.entriesAnalyzed} entries to prisma/seed-analysis.json`
  );
  console.log("Commit that file and `npm run seed` will load it on a fresh clone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
