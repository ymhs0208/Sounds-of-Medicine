CREATE TABLE IF NOT EXISTS line_links (
  id TEXT PRIMARY KEY,
  circle_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  line_sub TEXT NOT NULL,
  line_user_id TEXT,
  lang TEXT NOT NULL,
  role TEXT NOT NULL,
  notify_dose INTEGER NOT NULL DEFAULT 1,
  notify_missed INTEGER NOT NULL DEFAULT 1,
  notify_digest INTEGER NOT NULL DEFAULT 1,
  notify_refill INTEGER NOT NULL DEFAULT 1,
  quiet_start TEXT NOT NULL DEFAULT '22:00',
  quiet_end TEXT NOT NULL DEFAULT '07:00',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS line_links_member ON line_links (circle_id, member_id);
CREATE INDEX IF NOT EXISTS line_links_user ON line_links (line_user_id);
CREATE INDEX IF NOT EXISTS line_links_sub ON line_links (line_sub);

CREATE TABLE IF NOT EXISTS line_codes (
  code TEXT PRIMARY KEY,
  circle_id TEXT NOT NULL,
  member_id TEXT,
  kind TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE TABLE IF NOT EXISTS line_groups (
  circle_id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  bound_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS line_settings (
  circle_id TEXT PRIMARY KEY,
  detail_opt_in INTEGER NOT NULL DEFAULT 0,
  missed_window_min INTEGER NOT NULL DEFAULT 30,
  digest_time TEXT NOT NULL DEFAULT '21:00',
  last_digest_date TEXT,
  visit_date TEXT,
  supply_days INTEGER,
  observation_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS line_doses (
  circle_id TEXT NOT NULL,
  id TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  slot TEXT NOT NULL,
  status TEXT NOT NULL,
  reminded_at TEXT,
  missed_alerted_at TEXT,
  label_cipher TEXT,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS line_doses_circle_id ON line_doses (circle_id, id);
CREATE INDEX IF NOT EXISTS line_doses_circle_date ON line_doses (circle_id, date);

CREATE TABLE IF NOT EXISTS line_refills (
  circle_id TEXT NOT NULL,
  id TEXT NOT NULL,
  kind TEXT NOT NULL,
  due_date TEXT NOT NULL,
  sent_7 INTEGER NOT NULL DEFAULT 0,
  sent_3 INTEGER NOT NULL DEFAULT 0,
  label_cipher TEXT,
  PRIMARY KEY (circle_id, id)
);

CREATE TABLE IF NOT EXISTS line_alerts (
  circle_id TEXT NOT NULL,
  id TEXT NOT NULL,
  kind TEXT NOT NULL,
  sent_at TEXT,
  label_cipher TEXT,
  PRIMARY KEY (circle_id, id)
);

CREATE TABLE IF NOT EXISTS line_events (
  id TEXT PRIMARY KEY,
  circle_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  body TEXT NOT NULL,
  sig TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS line_events_circle ON line_events (circle_id, created_at);

CREATE TABLE IF NOT EXISTS line_relays (
  id TEXT PRIMARY KEY,
  circle_id TEXT NOT NULL,
  cipher TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS line_drafts (
  id TEXT PRIMARY KEY,
  line_user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  cipher TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
