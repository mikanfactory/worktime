export const up = `
CREATE TABLE IF NOT EXISTS attendance_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`

export const down = `
DROP TABLE IF EXISTS attendance_logs;
`
