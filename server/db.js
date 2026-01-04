// server/db.js
import Database from 'better-sqlite3';

const db = new Database('metrics.db');

// Ensure tables exist
db.exec(`
CREATE TABLE IF NOT EXISTS commits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT,
  push_success INTEGER
);

CREATE TABLE IF NOT EXISTS analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route TEXT,
  method TEXT,
  status INTEGER,
  response_time INTEGER,
  is_error INTEGER,
  timestamp TEXT,
  action TEXT,
  files_changed INTEGER,
  lines_added INTEGER,
  lines_removed INTEGER
);
`);

export default db;
