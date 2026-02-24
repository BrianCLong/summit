CREATE SCHEMA IF NOT EXISTS metrics;

CREATE TABLE IF NOT EXISTS metrics.facts_api_contract (
  observed_at TIMESTAMPTZ NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'global',
  service TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  http_status INTEGER NOT NULL CHECK (http_status >= 100 AND http_status <= 599),
  is_canary BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, service, endpoint, observed_at)
);

CREATE TABLE IF NOT EXISTS metrics.facts_archive_capture (
  collected_at_utc TIMESTAMPTZ NOT NULL,
  source_domain TEXT NOT NULL,
  source_url TEXT NOT NULL,
  priority_domain BOOLEAN NOT NULL DEFAULT false,
  capture_status TEXT NOT NULL CHECK (capture_status IN ('captured', 'blocked', 'missing', 'partial')),
  provider TEXT NOT NULL DEFAULT 'primary',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (source_url, collected_at_utc, provider)
);

CREATE TABLE IF NOT EXISTS metrics.facts_policy_decision (
  decided_at_utc TIMESTAMPTZ NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('allow', 'deny', 'quarantine', 'alert')),
  policy_family TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  source_tier TEXT,
  provider TEXT,
  job_id TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (policy_id, job_id, decided_at_utc)
);

CREATE INDEX IF NOT EXISTS idx_facts_api_contract_observed
  ON metrics.facts_api_contract (observed_at);

CREATE INDEX IF NOT EXISTS idx_facts_api_contract_status
  ON metrics.facts_api_contract (http_status, is_canary);

CREATE INDEX IF NOT EXISTS idx_facts_archive_capture_collected
  ON metrics.facts_archive_capture (collected_at_utc, priority_domain, capture_status);

CREATE INDEX IF NOT EXISTS idx_facts_policy_decision_decided
  ON metrics.facts_policy_decision (decided_at_utc, decision, policy_family);

CREATE OR REPLACE VIEW metrics.api_drift_incidents_daily AS
SELECT
  date_trunc('day', observed_at) AS day,
  service,
  count(*) FILTER (WHERE is_canary AND http_status BETWEEN 400 AND 599) AS canary_failures_4xx_5xx,
  count(*) FILTER (WHERE is_canary AND http_status BETWEEN 500 AND 599) AS canary_failures_5xx
FROM metrics.facts_api_contract
GROUP BY 1, 2;

CREATE OR REPLACE VIEW metrics.archive_completeness_daily AS
SELECT
  date_trunc('day', collected_at_utc) AS day,
  source_domain,
  count(*) FILTER (WHERE priority_domain) AS priority_total,
  count(*) FILTER (WHERE priority_domain AND capture_status = 'captured') AS priority_captured,
  CASE
    WHEN count(*) FILTER (WHERE priority_domain) = 0 THEN NULL
    ELSE
      count(*) FILTER (WHERE priority_domain AND capture_status = 'captured')::NUMERIC
      / NULLIF(count(*) FILTER (WHERE priority_domain), 0)
  END AS priority_completeness
FROM metrics.facts_archive_capture
GROUP BY 1, 2;

CREATE OR REPLACE VIEW metrics.policy_blocked_crawls_daily AS
SELECT
  date_trunc('day', decided_at_utc) AS day,
  count(*) FILTER (
    WHERE policy_family = 'crawl'
      AND decision IN ('deny', 'quarantine')
  ) AS blocked_crawls
FROM metrics.facts_policy_decision
GROUP BY 1;

CREATE OR REPLACE VIEW metrics.contested_provider_share_7d AS
WITH scoped AS (
  SELECT
    COALESCE(provider, 'unknown') AS provider
  FROM metrics.facts_policy_decision
  WHERE decided_at_utc >= now() - interval '7 days'
    AND source_tier = 'high-risk/contested'
    AND decision = 'allow'
),
grouped AS (
  SELECT provider, count(*)::NUMERIC AS provider_events
  FROM scoped
  GROUP BY provider
),
totals AS (
  SELECT sum(provider_events) AS total_events
  FROM grouped
)
SELECT
  grouped.provider,
  grouped.provider_events,
  CASE
    WHEN totals.total_events IS NULL OR totals.total_events = 0 THEN 0
    ELSE grouped.provider_events / totals.total_events
  END AS contested_provider_share
FROM grouped
CROSS JOIN totals
ORDER BY contested_provider_share DESC, provider ASC;
