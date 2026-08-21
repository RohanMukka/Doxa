-- CreateTable
CREATE TABLE "Hypothesis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "evidence" TEXT,
    "tryInstead" TEXT,
    "predicate" TEXT NOT NULL,
    "predicateText" TEXT NOT NULL,
    "lift" REAL NOT NULL,
    "nInside" INTEGER NOT NULL,
    "nOutside" INTEGER NOT NULL,
    "p" REAL NOT NULL,
    "q" REAL NOT NULL,
    "outcome" TEXT NOT NULL,
    "reason" TEXT,
    "trainingN" INTEGER NOT NULL,
    "holdoutN" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Hypothesis_runId_idx" ON "Hypothesis"("runId");

-- CreateIndex
CREATE INDEX "Hypothesis_createdAt_idx" ON "Hypothesis"("createdAt");
