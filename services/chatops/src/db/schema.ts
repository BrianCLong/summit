/**
 * PostgreSQL Database Schema for ChatOps
 *
 * This module defines the complete relational schema for:
 * - Conversation sessions and turns
 * - Medium-term memory (compressed summaries)
 * - Approval workflows
 * - ReAct traces
 * - Tool invocations
 * - Audit events
 *
 * Design Principles:
 * - Tenant isolation via tenant_id on all tables
 * - Soft deletes with deleted_at timestamps
 * - Full audit trail with created_at/updated_at
 * - JSONB for flexible metadata
 * - Proper indexing for query patterns
 */

import { Pool, PoolClient } from 'pg';

// =============================================================================
// SCHEMA DEFINITIONS
// =============================================================================

export const SCHEMA_VERSION = '1.0.0';

export const CREATE_SCHEMA_SQL = `
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE conversation_role AS ENUM ('user', 'assistant', 'system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE memory_tier AS ENUM ('short', 'medium', 'long');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM ('autonomous', 'hitl', 'prohibited');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'denied', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE trace_outcome AS ENUM ('success', 'partial', 'failed', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE osint_entity_type AS ENUM (
    'THREAT_ACTOR', 'INFRASTRUCTURE', 'MALWARE', 'CAMPAIGN',
    'TTP', 'INDICATOR', 'VULNERABILITY', 'NARRATIVE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE guardrail_action AS ENUM ('warn', 'block', 'escalate');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- SESSIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS chatops_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  investigation_id UUID,

  -- Session state
  status VARCHAR(50) DEFAULT 'active',
  platform VARCHAR(50) NOT NULL, -- 'slack', 'teams', 'web'
  channel_id VARCHAR(255),
  thread_id VARCHAR(255),

  -- Metadata
  user_agent TEXT,
  ip_address INET,
  clearance_level VARCHAR(50),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT sessions_tenant_idx UNIQUE (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON chatops_sessions(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON chatops_sessions(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_activity ON chatops_sessions(last_activity_at DESC);

-- =============================================================================
-- CONVERSATION TURNS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS chatops_turns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chatops_sessions(id) ON DELETE CASCADE,
  tenant_id VARCHAR(255) NOT NULL,

  -- Turn content
  role conversation_role NOT NULL,
  content TEXT NOT NULL,
  content_hash VARCHAR(64), -- SHA-256 for deduplication

  -- Token tracking
  token_count INTEGER NOT NULL DEFAULT 0,
  model_used VARCHAR(100),

  -- Intent classification
  intent VARCHAR(100),
  intent_confidence DECIMAL(5,4),
  consensus_score DECIMAL(5,4),

  -- Extracted entities (denormalized for query performance)
  osint_entities JSONB DEFAULT '[]'::jsonb,

  -- Guardrail flags
  guardrail_flags JSONB DEFAULT '[]'::jsonb,

  -- Memory tier (where this turn currently resides)
  memory_tier memory_tier DEFAULT 'short',
  compressed_at TIMESTAMPTZ,

  -- Provenance
  parent_turn_id UUID REFERENCES chatops_turns(id),
  trace_id UUID,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT turns_session_idx UNIQUE (session_id, id)
);

CREATE INDEX IF NOT EXISTS idx_turns_session ON chatops_turns(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_turns_tenant ON chatops_turns(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_turns_memory_tier ON chatops_turns(memory_tier, created_at);
CREATE INDEX IF NOT EXISTS idx_turns_intent ON chatops_turns(intent) WHERE intent IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_turns_entities ON chatops_turns USING GIN (osint_entities);

-- =============================================================================
-- MEDIUM-TERM MEMORY (SUMMARIES)
-- =============================================================================

CREATE TABLE IF NOT EXISTS chatops_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chatops_sessions(id) ON DELETE CASCADE,
  tenant_id VARCHAR(255) NOT NULL,

  -- Summary content
  summary TEXT NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0,

  -- Source turns
  turn_ids UUID[] NOT NULL,
  turn_count INTEGER NOT NULL,
  start_turn_at TIMESTAMPTZ NOT NULL,
  end_turn_at TIMESTAMPTZ NOT NULL,

  -- Extracted information
  key_facts JSONB DEFAULT '[]'::jsonb,
  decisions JSONB DEFAULT '[]'::jsonb,
  entities JSONB DEFAULT '[]'::jsonb,
  open_questions JSONB DEFAULT '[]'::jsonb,

  -- Classification
  primary_intent VARCHAR(100),
  outcome VARCHAR(50), -- 'success', 'partial', 'failed'

  -- Compression metadata
  compression_model VARCHAR(100),
  compression_ratio DECIMAL(5,2),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT summaries_session_idx UNIQUE (session_id, id)
);

CREATE INDEX IF NOT EXISTS idx_summaries_session ON chatops_summaries(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_summaries_expiry ON chatops_summaries(expires_at) WHERE expires_at IS NOT NULL;

-- =============================================================================
-- EXTRACTED FACTS (FOR LONG-TERM MEMORY SYNC)
-- =============================================================================

CREATE TABLE IF NOT EXISTS chatops_facts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chatops_sessions(id) ON DELETE CASCADE,
  tenant_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,

  -- Fact content
  content TEXT NOT NULL,
  content_embedding VECTOR(1536), -- OpenAI ada-002 dimensions

  -- Classification
  category VARCHAR(50) NOT NULL, -- 'finding', 'decision', 'preference', 'context'
  confidence DECIMAL(5,4) NOT NULL,

  -- Provenance
  source_turn_ids UUID[] NOT NULL,
  source_summary_id UUID REFERENCES chatops_summaries(id),

  -- Graph sync status
  neo4j_node_id VARCHAR(255),
  synced_to_graph_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_facts_session ON chatops_facts(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_facts_user ON chatops_facts(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_facts_category ON chatops_facts(category);
CREATE INDEX IF NOT EXISTS idx_facts_embedding ON chatops_facts USING ivfflat (content_embedding vector_cosine_ops);

-- =============================================================================
-- REACT TRACES
-- =============================================================================

CREATE TABLE IF NOT EXISTS chatops_traces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chatops_sessions(id) ON DELETE CASCADE,
  tenant_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,

  -- Trace metadata
  trigger_turn_id UUID REFERENCES chatops_turns(id),
  intent VARCHAR(100),

  -- Execution stats
  step_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_latency_ms INTEGER DEFAULT 0,
  hitl_escalations INTEGER DEFAULT 0,
  prohibited_blocks INTEGER DEFAULT 0,

  -- Outcome
  outcome trace_outcome,
  error_message TEXT,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Full trace data (for detailed analysis)
  steps JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_traces_session ON chatops_traces(session_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_traces_outcome ON chatops_traces(outcome);
CREATE INDEX IF NOT EXISTS idx_traces_user ON chatops_traces(tenant_id, user_id, started_at DESC);

-- =============================================================================
-- REACT STEPS (NORMALIZED)
-- =============================================================================

CREATE TABLE IF NOT EXISTS chatops_trace_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trace_id UUID NOT NULL REFERENCES chatops_traces(id) ON DELETE CASCADE,

  -- Step number
  step_number INTEGER NOT NULL,

  -- Thought
  thought TEXT NOT NULL,

  -- Action
  tool_id VARCHAR(100) NOT NULL,
  operation VARCHAR(100) NOT NULL,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_level risk_level NOT NULL,

  -- Observation
  result JSONB,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  tokens_used INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,

  -- Approval (if HITL)
  approval_request_id UUID,

  -- Timestamp
  executed_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT trace_steps_unique UNIQUE (trace_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_trace_steps_trace ON chatops_trace_steps(trace_id, step_number);
CREATE INDEX IF NOT EXISTS idx_trace_steps_tool ON chatops_trace_steps(tool_id, operation);

-- =============================================================================
-- APPROVAL REQUESTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS chatops_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id VARCHAR(255) NOT NULL,

  -- Request context
  session_id UUID NOT NULL REFERENCES chatops_sessions(id),
  trace_id UUID REFERENCES chatops_traces(id),
  step_id UUID REFERENCES chatops_trace_steps(id),
  requestor_id VARCHAR(255) NOT NULL,

  -- Operation details
  tool_id VARCHAR(100) NOT NULL,
  operation VARCHAR(100) NOT NULL,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_level risk_level NOT NULL,
  risk_reason TEXT,

  -- Approval requirements
  required_approvals INTEGER DEFAULT 1,
  required_roles JSONB DEFAULT '[]'::jsonb,

  -- Status
  status approval_status DEFAULT 'pending',

  -- Notification tracking
  notification_channel VARCHAR(255),
  notification_message_id VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,

  CONSTRAINT approvals_tenant_idx UNIQUE (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_approvals_status ON chatops_approvals(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_approvals_session ON chatops_approvals(session_id);
CREATE INDEX IF NOT EXISTS idx_approvals_expiry ON chatops_approvals(expires_at) WHERE status = 'pending';

-- =============================================================================
-- APPROVAL DECISIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS chatops_approval_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  approval_id UUID NOT NULL REFERENCES chatops_approvals(id) ON DELETE CASCADE,

  -- Decision
  approver_id VARCHAR(255) NOT NULL,
  approver_role VARCHAR(100),
  decision VARCHAR(20) NOT NULL, -- 'approve', 'deny'
  reason TEXT,

  -- Timestamp
  decided_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT approval_decisions_unique UNIQUE (approval_id, approver_id)
);

CREATE INDEX IF NOT EXISTS idx_approval_decisions_approval ON chatops_approval_decisions(approval_id);

-- =============================================================================
-- TOOL INVOCATIONS (AUDIT)
-- =============================================================================

CREATE TABLE IF NOT EXISTS chatops_tool_invocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id VARCHAR(255) NOT NULL,

  -- Context
  session_id UUID REFERENCES chatops_sessions(id),
  trace_id UUID REFERENCES chatops_traces(id),
  step_id UUID REFERENCES chatops_trace_steps(id),
  user_id VARCHAR(255) NOT NULL,

  -- Tool details
  tool_id VARCHAR(100) NOT NULL,
  tool_version VARCHAR(50),
  operation VARCHAR(100) NOT NULL,

  -- Input/Output (redacted for sensitive data)
  input_hash VARCHAR(64),
  input_preview TEXT, -- First 500 chars, redacted
  output_hash VARCHAR(64),
  output_preview TEXT,

  -- Risk classification
  risk_level risk_level NOT NULL,
  approval_id UUID REFERENCES chatops_approvals(id),

  -- Execution
  success BOOLEAN NOT NULL,
  error_code VARCHAR(50),
  error_message TEXT,
  tokens_used INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,

  -- Attestation
  tool_attestation_id VARCHAR(255),
  sbom_verified BOOLEAN DEFAULT FALSE,

  -- Timestamp
  invoked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_invocations_session ON chatops_tool_invocations(session_id, invoked_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_invocations_tool ON chatops_tool_invocations(tool_id, invoked_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_invocations_user ON chatops_tool_invocations(tenant_id, user_id, invoked_at DESC);

-- =============================================================================
-- OSINT ENTITIES (EXTRACTED)
-- =============================================================================

CREATE TABLE IF NOT EXISTS chatops_osint_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id VARCHAR(255) NOT NULL,

  -- Entity details
  entity_type osint_entity_type NOT NULL,
  value TEXT NOT NULL,
  normalized_value TEXT, -- Canonical form
  confidence DECIMAL(5,4) NOT NULL,

  -- Extraction source
  source VARCHAR(50) NOT NULL, -- 'regex', 'ner', 'llm'
  extraction_model VARCHAR(100),

  -- References
  mitre_id VARCHAR(20),
  cve_id VARCHAR(20),

  -- Graph linking
  linked_graph_id VARCHAR(255),
  linked_at TIMESTAMPTZ,
  link_confidence DECIMAL(5,4),

  -- First seen / context
  first_seen_turn_id UUID REFERENCES chatops_turns(id),
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),

  -- Occurrence tracking
  occurrence_count INTEGER DEFAULT 1,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT osint_entities_unique UNIQUE (tenant_id, entity_type, normalized_value)
);

CREATE INDEX IF NOT EXISTS idx_osint_entities_type ON chatops_osint_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_osint_entities_value ON chatops_osint_entities(normalized_value);
CREATE INDEX IF NOT EXISTS idx_osint_entities_mitre ON chatops_osint_entities(mitre_id) WHERE mitre_id IS NOT NULL;

-- =============================================================================
-- GUARDRAIL EVENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS chatops_guardrail_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id VARCHAR(255) NOT NULL,

  -- Context
  session_id UUID REFERENCES chatops_sessions(id),
  turn_id UUID REFERENCES chatops_turns(id),
  user_id VARCHAR(255) NOT NULL,

  -- Event details
  guardrail_type VARCHAR(50) NOT NULL, -- 'JAILBREAK_ATTEMPT', 'PII_DETECTED', etc.
  severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  action guardrail_action NOT NULL,

  -- Detection details
  description TEXT,
  pattern_matched TEXT,
  confidence DECIMAL(5,4),

  -- Response
  blocked BOOLEAN DEFAULT FALSE,
  escalated_to VARCHAR(255),

  -- Timestamp
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guardrail_events_session ON chatops_guardrail_events(session_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_guardrail_events_type ON chatops_guardrail_events(guardrail_type, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_guardrail_events_severity ON chatops_guardrail_events(severity) WHERE severity IN ('high', 'critical');

-- =============================================================================
-- MODEL ROUTING DECISIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS chatops_routing_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id VARCHAR(255) NOT NULL,

  -- Context
  session_id UUID REFERENCES chatops_sessions(id),
  turn_id UUID REFERENCES chatops_turns(id),

  -- Query
  query_hash VARCHAR(64) NOT NULL,
  query_tokens INTEGER NOT NULL,

  -- Models consulted
  models_used JSONB NOT NULL, -- Array of model results

  -- Consensus
  primary_intent VARCHAR(100) NOT NULL,
  confidence DECIMAL(5,4) NOT NULL,
  consensus_score DECIMAL(5,4) NOT NULL,
  dissenting_models JSONB DEFAULT '[]'::jsonb,

  -- Performance
  total_latency_ms INTEGER NOT NULL,

  -- Timestamp
  decided_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routing_decisions_session ON chatops_routing_decisions(session_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_routing_decisions_intent ON chatops_routing_decisions(primary_intent);

-- =============================================================================
-- SCHEMA MIGRATIONS TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS chatops_schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  description TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  checksum VARCHAR(64)
);

-- Insert initial version
INSERT INTO chatops_schema_migrations (version, description)
VALUES ('${SCHEMA_VERSION}', 'Initial schema creation')
ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_sessions_updated_at ON chatops_sessions;
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON chatops_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_turns_updated_at ON chatops_turns;
CREATE TRIGGER update_turns_updated_at
  BEFORE UPDATE ON chatops_turns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_facts_updated_at ON chatops_facts;
CREATE TRIGGER update_facts_updated_at
  BEFORE UPDATE ON chatops_facts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to expire old approvals
CREATE OR REPLACE FUNCTION expire_stale_approvals()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE chatops_approvals
  SET status = 'expired', resolved_at = NOW()
  WHERE status = 'pending' AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ language 'plpgsql';

-- Function to calculate session metrics
CREATE OR REPLACE FUNCTION get_session_metrics(p_session_id UUID)
RETURNS TABLE (
  turn_count BIGINT,
  total_tokens BIGINT,
  avg_confidence DECIMAL,
  trace_count BIGINT,
  hitl_count BIGINT,
  blocked_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM chatops_turns WHERE session_id = p_session_id) as turn_count,
    (SELECT COALESCE(SUM(token_count), 0) FROM chatops_turns WHERE session_id = p_session_id) as total_tokens,
    (SELECT AVG(intent_confidence) FROM chatops_turns WHERE session_id = p_session_id AND intent_confidence IS NOT NULL) as avg_confidence,
    (SELECT COUNT(*) FROM chatops_traces WHERE session_id = p_session_id) as trace_count,
    (SELECT COALESCE(SUM(hitl_escalations), 0) FROM chatops_traces WHERE session_id = p_session_id) as hitl_count,
    (SELECT COALESCE(SUM(prohibited_blocks), 0) FROM chatops_traces WHERE session_id = p_session_id) as blocked_count;
END;
$$ language 'plpgsql';
`;

// =============================================================================
// SCHEMA MANAGER
// =============================================================================

export class SchemaManager {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Initialize the schema
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(CREATE_SCHEMA_SQL);
      await client.query('COMMIT');
      console.log(`ChatOps schema initialized (version ${SCHEMA_VERSION})`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if schema is up to date
   */
  async checkVersion(): Promise<{ current: string; expected: string; needsUpdate: boolean }> {
    const result = await this.pool.query(
      `SELECT version FROM chatops_schema_migrations ORDER BY applied_at DESC LIMIT 1`,
    );

    const current = result.rows[0]?.version ?? 'none';
    return {
      current,
      expected: SCHEMA_VERSION,
      needsUpdate: current !== SCHEMA_VERSION,
    };
  }

  /**
   * Run pending migrations
   */
  async migrate(): Promise<void> {
    // Placeholder for future migrations
    const { needsUpdate } = await this.checkVersion();
    if (needsUpdate) {
      // Run migrations here
      await this.initialize();
    }
  }
}

// =============================================================================
// REPOSITORY INTERFACES
// =============================================================================

export interface SessionRepository {
  create(session: Omit<Session, 'id' | 'created_at'>): Promise<Session>;
  findById(id: string, tenantId: string): Promise<Session | null>;
  findByUser(userId: string, tenantId: string, limit?: number): Promise<Session[]>;
  updateActivity(id: string): Promise<void>;
  delete(id: string, tenantId: string): Promise<void>;
}

export interface TurnRepository {
  create(turn: Omit<Turn, 'id' | 'created_at'>): Promise<Turn>;
  findBySession(sessionId: string, limit?: number, offset?: number): Promise<Turn[]>;
  findByTier(sessionId: string, tier: string): Promise<Turn[]>;
  updateTier(turnId: string, tier: string): Promise<void>;
  countBySession(sessionId: string): Promise<number>;
}

export interface TraceRepository {
  create(trace: Omit<Trace, 'id'>): Promise<Trace>;
  findById(id: string): Promise<Trace | null>;
  findBySession(sessionId: string, limit?: number): Promise<Trace[]>;
  addStep(traceId: string, step: TraceStep): Promise<void>;
  complete(traceId: string, outcome: string): Promise<void>;
}

export interface ApprovalRepository {
  create(approval: Omit<Approval, 'id' | 'created_at'>): Promise<Approval>;
  findById(id: string): Promise<Approval | null>;
  findPending(tenantId: string): Promise<Approval[]>;
  addDecision(approvalId: string, decision: ApprovalDecision): Promise<void>;
  updateStatus(id: string, status: string): Promise<void>;
  expireStale(): Promise<number>;
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface Session {
  id: string;
  tenant_id: string;
  user_id: string;
  investigation_id?: string;
  status: string;
  platform: string;
  channel_id?: string;
  thread_id?: string;
  clearance_level?: string;
  created_at: Date;
  updated_at: Date;
  last_activity_at: Date;
}

export interface Turn {
  id: string;
  session_id: string;
  tenant_id: string;
  role: string;
  content: string;
  token_count: number;
  intent?: string;
  intent_confidence?: number;
  osint_entities: unknown[];
  guardrail_flags: unknown[];
  memory_tier: string;
  created_at: Date;
}

export interface Trace {
  id: string;
  session_id: string;
  tenant_id: string;
  user_id: string;
  trigger_turn_id?: string;
  intent?: string;
  step_count: number;
  total_tokens: number;
  total_latency_ms: number;
  hitl_escalations: number;
  prohibited_blocks: number;
  outcome?: string;
  started_at: Date;
  completed_at?: Date;
  steps: TraceStep[];
}

export interface TraceStep {
  step_number: number;
  thought: string;
  tool_id: string;
  operation: string;
  input: Record<string, unknown>;
  risk_level: string;
  result?: unknown;
  success: boolean;
  error_message?: string;
  tokens_used: number;
  latency_ms: number;
  executed_at: Date;
}

export interface Approval {
  id: string;
  tenant_id: string;
  session_id: string;
  trace_id?: string;
  requestor_id: string;
  tool_id: string;
  operation: string;
  input: Record<string, unknown>;
  risk_level: string;
  risk_reason?: string;
  required_approvals: number;
  status: string;
  created_at: Date;
  expires_at: Date;
  resolved_at?: Date;
}

export interface ApprovalDecision {
  approver_id: string;
  approver_role?: string;
  decision: string;
  reason?: string;
  decided_at: Date;
}
