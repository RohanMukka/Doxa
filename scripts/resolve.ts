/**
 * Settles every decision whose criterion has come due and can be checked.
 *
 *   npm run resolve
 *
 * Run it on a schedule if you like. Nothing here grades anything you have to
 * judge yourself — only the entries you handed a machine-checkable criterion.
 */
import { resolveDue } from "../src/lib/resolvers/run";
import { prisma } from "../src/lib/prisma";

const MARK = { correct: "✓", incorrect: "✕", pending: "·", unreadable: "!" } as const;

async function main() {
  const report = await resolveDue();

  if (report.due === 0) {
    console.log("Nothing due with an automatic check attached.");
    return;
  }

  for (const r of report.results) {
    console.log(`${MARK[r.status]} ${r.decision}`);
    console.log(`    ${r.criterion} — ${r.detail}`);
  }

  console.log("");
  console.log(
    `${report.due} due · ${report.settled} settled · ${report.stillPending} still pending` +
      (report.unreadable ? ` · ${report.unreadable} unreadable` : "")
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
