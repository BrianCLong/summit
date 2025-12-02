-- SIGINT Platform Schema
-- To be applied via migration tool

CREATE TABLE IF NOT EXISTS sigint_emitters (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255),
  type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  frequency_min BIGINT, -- Hz
  frequency_max BIGINT, -- Hz
  detected_modulations TEXT[], -- Array of strings
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS sigint_signals (
  id VARCHAR(64) PRIMARY KEY,
  emitter_id VARCHAR(64) REFERENCES sigint_emitters(id),
  timestamp TIMESTAMPTZ NOT NULL,
  frequency BIGINT NOT NULL, -- Hz
  bandwidth BIGINT NOT NULL, -- Hz
  power DOUBLE PRECISION, -- dBm
  snr DOUBLE PRECISION, -- dB
  duration DOUBLE PRECISION, -- ms
  modulation_type VARCHAR(20),
  classification_label VARCHAR(100),
  classification_confidence DOUBLE PRECISION,
  threat_level VARCHAR(20),
  geolocation JSONB, -- { lat, lon, acc, method }
  content_snippet TEXT, -- Decrypted or raw content
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_sigint_signals_timestamp ON sigint_signals(timestamp);
CREATE INDEX IF NOT EXISTS idx_sigint_signals_emitter ON sigint_signals(emitter_id);
CREATE INDEX IF NOT EXISTS idx_sigint_emitters_last_seen ON sigint_emitters(last_seen_at);
