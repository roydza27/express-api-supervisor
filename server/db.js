import Database from "better-sqlite3";

const db = new Database("C:\\Users\\royal\\Documents\\Daily-Plan-Projects\\backend-metrics\\metrics.db");

// Create only api_metrics table
db.exec(`
CREATE TABLE IF NOT EXISTS api_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route TEXT,
  method TEXT,
  status INTEGER,
  response_time INTEGER,
  is_error INTEGER,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);


export default db;
