/**
 * Walks the journal's hash chain and checks the projection against it.
 *
 *   npm run verify
 *
 * Exits non-zero on any break, so it can sit in a pre-commit hook or CI. If
 * this passes, every entry in the database is byte-for-byte what was written
 * when it was written — which is the only reason to believe a confidence
 * recorded before an outcome was really recorded before the outcome.
 */
import { verifyJournal } from "../src/lib/journal/verify";
import { prisma } from "../src/lib/prisma";

async function main() {
  const report = await verifyJournal();

  console.log(`chain      ${report.chain.events} events`);
  console.log(`head       ${report.chain.head}`);
  console.log(`projection ${report.projection.entries} entries`);
  console.log("");

  if (report.ok) {
    console.log("Intact. Every event hashes to the one after it, and the");
    console.log("entries on screen replay exactly from the log.");
    return;
  }

  for (const b of report.chain.breaks) {
    console.error(
      `BREAK  seq ${b.seq}  ${b.reason}\n       expected ${b.expected}\n       found    ${b.found}`
    );
  }
  for (const d of report.projection.drift) {
    console.error(
      `DRIFT  entry ${d.entryId}  field ${d.field}\n       log   ${JSON.stringify(d.inLog)}\n       table ${JSON.stringify(d.inTable)}`
    );
  }
  console.error("");
  console.error("The journal has been modified outside the log.");
  process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
