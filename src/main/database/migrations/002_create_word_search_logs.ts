export const up = `
CREATE TABLE word_search_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  japanese_word TEXT NOT NULL,
  search_result TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_word_search_logs_created_at ON word_search_logs(created_at);
CREATE INDEX idx_word_search_logs_japanese_word ON word_search_logs(japanese_word);
`

export const down = `
DROP INDEX IF EXISTS idx_word_search_logs_japanese_word;
DROP INDEX IF EXISTS idx_word_search_logs_created_at;
DROP TABLE IF EXISTS word_search_logs;
`
