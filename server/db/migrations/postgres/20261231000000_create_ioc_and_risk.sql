CREATE TABLE IF NOT EXISTS iocs (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  value TEXT NOT NULL,
  source VARCHAR(255),
  external_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(type, value)
);

CREATE TABLE IF NOT EXISTS risk_assessments (
  id SERIAL PRIMARY KEY,
  ioc_id INTEGER REFERENCES iocs(id),
  risk_score INTEGER,
  summary TEXT,
  analyst_model VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
