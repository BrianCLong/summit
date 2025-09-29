CREATE TABLE agent (
  id TEXT PRIMARY KEY,
  name TEXT,
  tags TEXT,
  endpoint TEXT,
  pubkey BLOB
);

CREATE TABLE room (
  id TEXT PRIMARY KEY,
  name TEXT,
  mls_group_id TEXT
);

CREATE TABLE event (
  id TEXT PRIMARY KEY,
  ts INTEGER,
  type TEXT,
  subject TEXT,
  resource TEXT,
  payload BLOB,
  sig BLOB
);

CREATE TABLE view_cache (
  id TEXT PRIMARY KEY,
  kind TEXT,
  data BLOB,
  updated_at INTEGER
);
