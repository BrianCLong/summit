-- Migration: Add NL to Cypher translation and execution tables
-- Date: 2025-08-20
-- Purpose: Support GA Core Copilot NL→Cypher with audit trail and guardrails

CREATE TABLE IF NOT EXISTS nl_cypher_translations (
  id UUID PRIMARY KEY,
  
  -- Query content
  original_query TEXT NOT NULL,
  generated_cypher TEXT NOT NULL,
  confidence DECIMAL(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Analysis results
  explanation TEXT,
  warnings JSONB DEFAULT '[]',
  risk_level VARCHAR(10) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  requires_confirmation BOOLEAN NOT NULL DEFAULT FALSE,
  estimated_results INTEGER DEFAULT 0,
  
  -- Audit and explainability
  citations JSONB DEFAULT '[]',
  redactions JSONB DEFAULT '[]',
  
  -- Metadata
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Performance indexes
  INDEX idx_nl_translations_user_created (created_by, created_at),
  INDEX idx_nl_translations_risk (risk_level),
  INDEX idx_nl_translations_confidence (confidence)
);

CREATE TABLE IF NOT EXISTS nl_cypher_executions (
  translation_id UUID PRIMARY KEY REFERENCES nl_cypher_translations(id),
  
  -- Execution status
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED')),
  
  -- Results and errors
  results JSONB,
  error TEXT,
  
  -- Execution metadata
  executed_at TIMESTAMP WITH TIME ZONE,
  executed_by VARCHAR(255) NOT NULL,
  
  -- Full audit trail
  audit_trail JSONB NOT NULL DEFAULT '[]',
  
  -- Performance indexes  
  INDEX idx_nl_executions_status (status),
  INDEX idx_nl_executions_executed (executed_by, executed_at),
  INDEX idx_nl_executions_date (executed_at)
);

-- Create view for Copilot usage analytics
CREATE OR REPLACE VIEW copilot_nl_analytics AS
SELECT 
  DATE_TRUNC('day', t.created_at) as query_date,
  COUNT(*) as total_queries,
  COUNT(CASE WHEN t.risk_level = 'LOW' THEN 1 END) as low_risk_queries,
  COUNT(CASE WHEN t.risk_level = 'MEDIUM' THEN 1 END) as medium_risk_queries,
  COUNT(CASE WHEN t.risk_level = 'HIGH' THEN 1 END) as high_risk_queries,
  COUNT(CASE WHEN t.requires_confirmation THEN 1 END) as confirmation_required,
  
  -- Execution statistics
  COUNT(e.translation_id) as executed_queries,
  COUNT(CASE WHEN e.status = 'EXECUTED' THEN 1 END) as successful_executions,
  COUNT(CASE WHEN e.status = 'FAILED' THEN 1 END) as failed_executions,
  COUNT(CASE WHEN e.status = 'REJECTED' THEN 1 END) as rejected_queries,
  
  -- Quality metrics
  AVG(t.confidence) as avg_confidence,
  AVG(t.estimated_results) as avg_estimated_results,
  
  -- User activity
  COUNT(DISTINCT t.created_by) as unique_users
FROM nl_cypher_translations t
LEFT JOIN nl_cypher_executions e ON t.id = e.translation_id
WHERE t.created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', t.created_at)
ORDER BY query_date DESC;

-- Create function to get user's recent NL queries
CREATE OR REPLACE FUNCTION get_user_nl_history(
  p_user_id VARCHAR(255),
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
  translation_id UUID,
  original_query TEXT,
  confidence DECIMAL,
  risk_level VARCHAR,
  execution_status VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.original_query,
    t.confidence,
    t.risk_level,
    COALESCE(e.status, 'NOT_EXECUTED') as execution_status,
    t.created_at
  FROM nl_cypher_translations t
  LEFT JOIN nl_cypher_executions e ON t.id = e.translation_id
  WHERE t.created_by = p_user_id
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if query needs approval
CREATE OR REPLACE FUNCTION requires_approval(
  p_risk_level VARCHAR,
  p_confidence DECIMAL,
  p_user_role VARCHAR DEFAULT 'user'
) RETURNS BOOLEAN AS $$
BEGIN
  -- High risk always requires approval
  IF p_risk_level = 'HIGH' THEN
    RETURN TRUE;
  END IF;
  
  -- Medium risk with low confidence requires approval
  IF p_risk_level = 'MEDIUM' AND p_confidence < 0.75 THEN
    RETURN TRUE;
  END IF;
  
  -- Admin users can bypass most approvals
  IF p_user_role = 'admin' AND p_risk_level != 'HIGH' THEN
    RETURN FALSE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Create table for NL query patterns and templates
CREATE TABLE IF NOT EXISTS nl_query_patterns (
  id SERIAL PRIMARY KEY,
  
  -- Pattern definition
  pattern_name VARCHAR(100) NOT NULL UNIQUE,
  regex_pattern TEXT NOT NULL,
  cypher_template TEXT NOT NULL,
  
  -- Pattern metadata
  confidence_score DECIMAL(4,3) NOT NULL DEFAULT 0.75,
  risk_level VARCHAR(10) NOT NULL DEFAULT 'LOW',
  description TEXT,
  
  -- Usage statistics
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(4,3) DEFAULT 0.0,
  
  -- Versioning
  version INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_patterns_active (active),
  INDEX idx_patterns_confidence (confidence_score),
  INDEX idx_patterns_usage (usage_count DESC)
);

-- Insert common NL→Cypher patterns
INSERT INTO nl_query_patterns (pattern_name, regex_pattern, cypher_template, confidence_score, description) VALUES
('find_person_by_name', 'find.*person.*named?\s+(\w+)', 'MATCH (p:Person) WHERE p.name CONTAINS $name RETURN p LIMIT 10', 0.85, 'Find person by name'),
('find_organization', 'find.*(?:organization|company|org).*(\w+)', 'MATCH (o:Organization) WHERE o.name CONTAINS $org RETURN o LIMIT 10', 0.85, 'Find organization by name'),
('relationships_between', 'relationship.*between.*(\w+).*(?:and|&).*(\w+)', 'MATCH (a)-[r]-(b) WHERE a.name CONTAINS $entity1 AND b.name CONTAINS $entity2 RETURN a,r,b LIMIT 20', 0.75, 'Find relationships between entities'),
('count_entities', 'how many.*(\w+)', 'MATCH (n:$entityType) RETURN count(n) as count', 0.80, 'Count entities of a type'),
('recent_activities', '(?:recent|latest|last).*(?:activities|events)', 'MATCH (n) WHERE n.created_at > datetime() - duration({days: 30}) RETURN n ORDER BY n.created_at DESC LIMIT 20', 0.70, 'Find recent activities'),
('connected_to', '(?:connected|linked).*to.*(\w+)', 'MATCH (start {name: $entity})-[*1..3]-(connected) RETURN DISTINCT connected LIMIT 15', 0.65, 'Find entities connected to a specific entity');

-- Add comments
COMMENT ON TABLE nl_cypher_translations IS 'GA Core: Natural language to Cypher query translations with explainability';
COMMENT ON TABLE nl_cypher_executions IS 'GA Core: Audit trail for NL query executions with approval workflow';
COMMENT ON VIEW copilot_nl_analytics IS 'GA Core: Analytics view for Copilot NL→Cypher usage patterns';
COMMENT ON TABLE nl_query_patterns IS 'GA Core: Reusable patterns for NL to Cypher translation templates';