-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decision" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "category" TEXT,
    "consultedOthers" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolutionDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "outcome" TEXT,
    "resolutionNote" TEXT
);
