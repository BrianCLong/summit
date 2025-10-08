-- IOC fast lookup
CREATE INDEX IF NOT EXISTS idx_iocs_value ON iocs (value);
CREATE INDEX IF NOT EXISTS idx_iocs_type  ON iocs (type);
-- Full-text search
CREATE INDEX IF NOT EXISTS idx_cases_ft ON cases USING GIN (to_tsvector('english', title || ' ' || coalesce(description,'')));
-- Facets & time
CREATE INDEX IF NOT EXISTS idx_cases_status   ON cases (status);
CREATE INDEX IF NOT EXISTS idx_cases_created  ON cases (created_at DESC);
-- Geospatial
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE INDEX IF NOT EXISTS idx_events_geo ON events USING GIST (geom);

