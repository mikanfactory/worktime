/*
  Warnings:

  - You are about to drop the column `type` on the `attendance_logs` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_attendance_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "event_type" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_attendance_logs" ("created_at", "event_type", "id", "note", "timestamp") SELECT "created_at", "event_type", "id", "note", "timestamp" FROM "attendance_logs";
DROP TABLE "attendance_logs";
ALTER TABLE "new_attendance_logs" RENAME TO "attendance_logs";
CREATE INDEX "idx_attendance_logs_timestamp" ON "attendance_logs"("timestamp" DESC);
CREATE INDEX "idx_attendance_logs_event_type_timestamp" ON "attendance_logs"("event_type", "timestamp" DESC);
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
