-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Analysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "insights" TEXT NOT NULL,
    "entriesAnalyzed" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "backend" TEXT NOT NULL DEFAULT 'gemini',
    "model" TEXT NOT NULL DEFAULT 'unknown',
    "ranLocally" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Analysis" ("createdAt", "entriesAnalyzed", "id", "insights") SELECT "createdAt", "entriesAnalyzed", "id", "insights" FROM "Analysis";
DROP TABLE "Analysis";
ALTER TABLE "new_Analysis" RENAME TO "Analysis";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
