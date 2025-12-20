-- Deterministic seed data for the query plan regression suite.
-- Safe to run multiple times; it uses TRUNCATE and stable identifiers.

CREATE SCHEMA IF NOT EXISTS plan_regression;
SET search_path TO plan_regression, public;

CREATE TABLE IF NOT EXISTS investigations (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pr_investigations_status_priority_created_at_idx
  ON plan_regression.investigations (status, priority, created_at DESC);

CREATE TABLE IF NOT EXISTS activity_log (
  id BIGSERIAL PRIMARY KEY,
  investigation_id TEXT NOT NULL REFERENCES plan_regression.investigations (id),
  actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pr_activity_log_investigation_id_created_at_idx
  ON plan_regression.activity_log (investigation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  risk_score INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS pr_entities_entity_type_idx
  ON plan_regression.entities (entity_type);

TRUNCATE TABLE plan_regression.activity_log, plan_regression.entities, plan_regression.investigations;

INSERT INTO plan_regression.investigations (id, owner_id, status, priority, created_at)
SELECT
  'INV-' || gs AS id,
  'owner-' || (gs % 150) AS owner_id,
  CASE
    WHEN gs % 4 = 0 THEN 'closed'
    WHEN gs % 4 = 1 THEN 'open'
    WHEN gs % 4 = 2 THEN 'triage'
    ELSE 'open'
  END AS status,
  CASE
    WHEN gs % 5 = 0 THEN 'high'
    WHEN gs % 5 = 1 THEN 'medium'
    WHEN gs % 5 = 2 THEN 'medium'
    ELSE 'low'
  END AS priority,
  NOW() - (gs || ' minutes')::interval AS created_at
FROM generate_series(1, 2000) AS gs
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    priority = EXCLUDED.priority,
    created_at = EXCLUDED.created_at;

INSERT INTO plan_regression.activity_log (investigation_id, actor_id, created_at)
SELECT
  'INV-' || ((gs % 2000) + 1) AS investigation_id,
  'actor-' || (gs % 500) AS actor_id,
  NOW() - (gs || ' seconds')::interval AS created_at
FROM generate_series(1, 12000) AS gs;

INSERT INTO plan_regression.entities (id, entity_type, risk_score)
SELECT
  'actor-' || gs AS id,
  CASE
    WHEN gs % 4 = 0 THEN 'PERSON'
    WHEN gs % 4 = 1 THEN 'ORG'
    WHEN gs % 4 = 2 THEN 'DEVICE'
    ELSE 'LOI'
  END AS entity_type,
  (gs % 100) AS risk_score
FROM generate_series(1, 500) AS gs
ON CONFLICT (id) DO UPDATE
SET entity_type = EXCLUDED.entity_type,
    risk_score = EXCLUDED.risk_score;
