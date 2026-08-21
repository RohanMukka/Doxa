-- AlterTable
ALTER TABLE "Entry" ADD COLUMN "adjudication" TEXT;
ALTER TABLE "Entry" ADD COLUMN "falsifier" TEXT;
ALTER TABLE "Entry" ADD COLUMN "recalledConfidence" INTEGER;

-- CreateTable
CREATE TABLE "Event" (
    "seq" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "recordedAt" DATETIME NOT NULL,
    "prevHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_hash_key" ON "Event"("hash");

-- CreateIndex
CREATE INDEX "Event_entryId_idx" ON "Event"("entryId");

-- CreateIndex
CREATE INDEX "Event_recordedAt_idx" ON "Event"("recordedAt");
