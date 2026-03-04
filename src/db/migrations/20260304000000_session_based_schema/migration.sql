-- CreateTable
CREATE TABLE "work_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "clock_in_at" TEXT NOT NULL,
    "clock_out_at" TEXT,
    "note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "break_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "work_session_id" INTEGER NOT NULL,
    "start_at" TEXT NOT NULL,
    "end_at" TEXT,
    "note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "break_sessions_work_session_id_fkey" FOREIGN KEY ("work_session_id") REFERENCES "work_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "idx_work_sessions_date" ON "work_sessions"("date");

-- CreateIndex
CREATE INDEX "idx_work_sessions_clock_in" ON "work_sessions"("clock_in_at" DESC);

-- CreateIndex
CREATE INDEX "idx_break_sessions_work_session_id" ON "break_sessions"("work_session_id");

-- DropTable (old schema)
DROP TABLE IF EXISTS "attendance_logs";
