export const up = `
CREATE TABLE IF NOT EXISTS translation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`

export const down = `
DROP TABLE IF EXISTS translation_logs;
`
