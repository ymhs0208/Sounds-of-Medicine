CREATE TABLE IF NOT EXISTS users (
  line_sub TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS circles (
  id TEXT PRIMARY KEY,
  owner_sub TEXT NOT NULL,
  generation INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  circle_id TEXT NOT NULL,
  line_sub TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  removed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS members_circle_sub ON members (circle_id, line_sub);
CREATE INDEX IF NOT EXISTS members_sub ON members (line_sub);

CREATE TABLE IF NOT EXISTS records (
  circle_id TEXT NOT NULL,
  record_id TEXT NOT NULL,
  generation INTEGER NOT NULL,
  vector TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  device_id TEXT NOT NULL,
  cipher TEXT NOT NULL,
  size INTEGER NOT NULL,
  PRIMARY KEY (circle_id, record_id)
);

CREATE INDEX IF NOT EXISTS records_circle_updated ON records (circle_id, updated_at);
