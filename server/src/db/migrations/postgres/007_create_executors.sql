CREATE TABLE IF NOT EXISTS executors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  labels TEXT[] NOT NULL DEFAULT '{}',
  capacity INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ready',
  last_heartbeat TIMESTAMP
);
