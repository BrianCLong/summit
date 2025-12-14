-- Time-series engine storage for TimescaleDB
CREATE TABLE IF NOT EXISTS time_series_points (
  id BIGSERIAL PRIMARY KEY,
  measurement TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  tags JSONB DEFAULT '{}'::jsonb,
  fields JSONB NOT NULL
);

SELECT create_hypertable('time_series_points', 'ts', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_time_series_measurement_ts ON time_series_points (measurement, ts DESC);
CREATE INDEX IF NOT EXISTS idx_time_series_tags_gin ON time_series_points USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_time_series_fields_gin ON time_series_points USING GIN (fields jsonb_path_ops);
