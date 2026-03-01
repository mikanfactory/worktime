-- CreateTable
CREATE TABLE IF NOT EXISTS "attendance_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "event_type" TEXT NOT NULL,
    "type" TEXT,
    "timestamp" TEXT NOT NULL,
    "note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_attendance_logs_timestamp" ON "attendance_logs"("timestamp" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_attendance_logs_event_type_timestamp" ON "attendance_logs"("event_type", "timestamp" DESC);
