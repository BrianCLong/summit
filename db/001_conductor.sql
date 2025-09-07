-- Conductor durable run state and messaging
CREATE TABLE IF NOT EXISTS run (
  id UUID PRIMARY KEY,
  runbook TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING','RUNNING','BLOCKED','SUCCEEDED','FAILED','CANCELED')),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS run_step (
  run_id UUID REFERENCES run(id) ON DELETE CASCADE,
  step_id TEXT,
  status TEXT NOT NULL,
  attempt INT DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  blocked_reason TEXT,
  PRIMARY KEY (run_id, step_id)
);

CREATE TABLE IF NOT EXISTS run_event (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID NOT NULL,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL,
  ts TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outbox (
  id BIGSERIAL PRIMARY KEY,
  topic TEXT NOT NULL,
  key TEXT,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS outbox_unsent_idx ON outbox (sent_at) WHERE sent_at IS NULL;

CREATE TABLE IF NOT EXISTS inbox (
  source TEXT NOT NULL,
  event_id TEXT NOT NULL,
  received_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (source, event_id)
);

-- simple schedules table for cron-based triggers
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY,
  runbook TEXT NOT NULL,
  cron TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ
);

-- Approvals system tables
CREATE TABLE IF NOT EXISTS approvals_rule (
  run_id UUID NOT NULL,
  step_id TEXT NOT NULL,
  required INT DEFAULT 1,
  approvers TEXT[] DEFAULT '{}',
  PRIMARY KEY (run_id, step_id)
);

CREATE TABLE IF NOT EXISTS approvals (
  run_id UUID NOT NULL,
  step_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('approved','declined')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (run_id, step_id, user_id)
);

-- MCP servers registry and audit
CREATE TABLE IF NOT EXISTS mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  url TEXT NOT NULL,
  auth_token TEXT,
  scopes TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  fingerprint_sha256 TEXT,
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active','inactive','error')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mcp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'connected' CHECK (status IN ('connected','disconnected','error')),
  created_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS mcp_audit (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES mcp_sessions(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  params JSONB,
  response JSONB,
  error_message TEXT,
  duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Router decisions and model routing
CREATE TABLE IF NOT EXISTS router_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL,
  node_id TEXT NOT NULL,
  selected_model TEXT NOT NULL,
  candidates JSONB NOT NULL, -- [{model, score, reason}]
  policy_applied TEXT,
  override_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Evidence and provenance (WORM compliance)
CREATE TABLE IF NOT EXISTS evidence_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL,
  artifact_type TEXT NOT NULL, -- 'sbom', 'attestation', 'log', 'output'
  s3_key TEXT NOT NULL,
  sha256_hash TEXT NOT NULL,
  size_bytes BIGINT,
  immutable BOOLEAN DEFAULT TRUE,
  retention_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Serving lane metrics for vLLM/Ray
CREATE TABLE IF NOT EXISTS serving_metrics (
  id BIGSERIAL PRIMARY KEY,
  lane_id TEXT NOT NULL,
  metric_name TEXT NOT NULL, -- 'qDepth', 'batchSize', 'kvHit', 'gpuUtil', 'cpuUtil'
  metric_value DOUBLE PRECISION NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX serving_metrics_lane_time_idx ON serving_metrics (lane_id, timestamp DESC);

-- Budget and cost tracking
CREATE TABLE IF NOT EXISTS budget_spend (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  expert_type TEXT NOT NULL, -- 'LLM_LIGHT', 'LLM_HEAVY', etc
  amount_usd DECIMAL(10,4) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX budget_spend_tenant_period_idx ON budget_spend (tenant_id, period_start, period_end);

-- Data Residency & BYOK Tables
CREATE TABLE IF NOT EXISTS data_residency_configs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT UNIQUE NOT NULL,
  region TEXT NOT NULL,
  country TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  data_classifications JSONB DEFAULT '[]',
  allowed_transfers JSONB DEFAULT '[]',
  retention_policy_days INTEGER DEFAULT 2555,
  encryption_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kms_configs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('aws-kms', 'azure-keyvault', 'gcp-kms', 'hashicorp-vault', 'customer-managed')),
  key_id TEXT NOT NULL,
  region TEXT NOT NULL,
  endpoint TEXT,
  encrypted_credentials TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS data_residency_audit (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  action TEXT NOT NULL,
  config_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS encryption_audit (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  data_hash TEXT NOT NULL,
  classification_level TEXT NOT NULL,
  encryption_method TEXT NOT NULL,
  kms_provider TEXT,
  region TEXT,
  compliant BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS decryption_audit (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  data_hash TEXT,
  decryption_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  successful BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS residency_reports (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  report_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_residency_tenant ON data_residency_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kms_tenant ON kms_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_residency_audit_tenant ON data_residency_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_encryption_audit_tenant ON encryption_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_decryption_audit_tenant ON decryption_audit(tenant_id);

-- Quality Evaluation Platform Tables
CREATE TABLE IF NOT EXISTS semantic_slos (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  threshold DECIMAL(5,4) NOT NULL,
  operator TEXT NOT NULL CHECK (operator IN ('gt', 'lt', 'eq', 'gte', 'lte')),
  time_window INTEGER NOT NULL,
  evaluation_method TEXT NOT NULL CHECK (evaluation_method IN ('automated', 'human', 'hybrid')),
  criticality TEXT NOT NULL CHECK (criticality IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evaluation_results (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  input_text TEXT NOT NULL,
  output_text TEXT NOT NULL,
  ground_truth TEXT,
  metrics JSONB NOT NULL,
  slo_violations JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batch_evaluations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  dataset_size INTEGER NOT NULL,
  summary JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quality_reports (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  time_range_start TIMESTAMP NOT NULL,
  time_range_end TIMESTAMP NOT NULL,
  overall_score DECIMAL(5,4) NOT NULL,
  slo_compliance DECIMAL(5,4) NOT NULL,
  metrics JSONB NOT NULL,
  recommendations JSONB NOT NULL,
  regression_detected BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS slo_alerts (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  slo_id TEXT NOT NULL,
  alert_level TEXT NOT NULL CHECK (alert_level IN ('info', 'warning', 'error', 'critical')),
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quality_audit (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_semantic_slos_tenant ON semantic_slos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_tenant_model ON evaluation_results(tenant_id, model_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_created_at ON evaluation_results(created_at);
CREATE INDEX IF NOT EXISTS idx_batch_evaluations_tenant_model ON batch_evaluations(tenant_id, model_id);
CREATE INDEX IF NOT EXISTS idx_quality_reports_tenant_model ON quality_reports(tenant_id, model_id);
CREATE INDEX IF NOT EXISTS idx_slo_alerts_tenant ON slo_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quality_audit_tenant ON quality_audit(tenant_id);
