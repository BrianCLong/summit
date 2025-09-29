-- Migration: Add policy appeals and overrides system
-- Date: 2025-08-20
-- Purpose: Support GA Core policy-by-default with structured appeal paths

CREATE TABLE IF NOT EXISTS policy_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to original policy decision
  decision_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  
  -- Appeal details
  justification TEXT NOT NULL,
  business_need TEXT NOT NULL,
  urgency VARCHAR(10) NOT NULL CHECK (urgency IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  requested_duration VARCHAR(50), -- e.g., "24 hours", "3 days"
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' 
    CHECK (status IN ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED', 'WITHDRAWN')),
  
  -- Response details
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by VARCHAR(255), -- Data Steward ID
  response_reason TEXT,
  
  -- SLA tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sla_deadline TIMESTAMP WITH TIME ZONE,
  escalation_deadline TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  created_by VARCHAR(255) DEFAULT 'system',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Performance indexes
  INDEX idx_policy_appeals_status (status, created_at),
  INDEX idx_policy_appeals_user (user_id, created_at),
  INDEX idx_policy_appeals_responder (responded_by, responded_at),
  INDEX idx_policy_appeals_sla (sla_deadline, status),
  INDEX idx_policy_appeals_decision (decision_id)
);

CREATE TABLE IF NOT EXISTS policy_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  decision_id VARCHAR(255) NOT NULL,
  appeal_id UUID REFERENCES policy_appeals(id),
  user_id VARCHAR(255) NOT NULL,
  approved_by VARCHAR(255) NOT NULL, -- Data Steward who approved
  
  -- Override details
  override_reason TEXT,
  conditions TEXT, -- Any conditions applied to the override
  
  -- Temporal validity
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by VARCHAR(255),
  revoke_reason TEXT,
  
  -- Usage tracking
  first_used TIMESTAMP WITH TIME ZONE,
  last_used TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  
  -- Performance indexes
  INDEX idx_policy_overrides_user (user_id, expires_at),
  INDEX idx_policy_overrides_decision (decision_id),
  INDEX idx_policy_overrides_expiry (expires_at, revoked_at),
  INDEX idx_policy_overrides_approver (approved_by, created_at)
);

CREATE TABLE IF NOT EXISTS policy_decisions_log (
  id SERIAL PRIMARY KEY,
  
  -- Decision details
  decision_id VARCHAR(255) NOT NULL,
  policy_name VARCHAR(100) NOT NULL,
  decision VARCHAR(10) NOT NULL CHECK (decision IN ('ALLOW', 'DENY')),
  reason TEXT,
  
  -- Request context
  user_id VARCHAR(255),
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  action VARCHAR(100),
  
  -- Appeal information
  appeal_available BOOLEAN DEFAULT FALSE,
  appeal_id UUID,
  
  -- Request metadata
  ip_address INET,
  user_agent TEXT,
  tenant_id VARCHAR(255),
  
  -- Performance and caching
  evaluation_time_ms INTEGER,
  cache_hit BOOLEAN DEFAULT FALSE,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Performance indexes
  INDEX idx_policy_decisions_user (user_id, created_at),
  INDEX idx_policy_decisions_policy (policy_name, decision, created_at),
  INDEX idx_policy_decisions_resource (resource_type, resource_id),
  INDEX idx_policy_decisions_appeals (appeal_available, appeal_id)
);

-- Create view for appeal analytics
CREATE OR REPLACE VIEW policy_appeal_analytics AS
SELECT 
  DATE_TRUNC('day', created_at) as appeal_date,
  COUNT(*) as total_appeals,
  COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_appeals,
  COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_appeals,
  COUNT(CASE WHEN status = 'DENIED' THEN 1 END) as denied_appeals,
  COUNT(CASE WHEN status = 'EXPIRED' THEN 1 END) as expired_appeals,
  
  -- SLA metrics
  COUNT(CASE WHEN responded_at IS NOT NULL AND responded_at <= sla_deadline THEN 1 END) as within_sla,
  COUNT(CASE WHEN responded_at IS NOT NULL AND responded_at > sla_deadline THEN 1 END) as sla_breached,
  COUNT(CASE WHEN responded_at IS NULL AND NOW() > sla_deadline THEN 1 END) as sla_at_risk,
  
  -- Approval rates by urgency
  COUNT(CASE WHEN urgency = 'CRITICAL' AND status = 'APPROVED' THEN 1 END) as critical_approved,
  COUNT(CASE WHEN urgency = 'CRITICAL' THEN 1 END) as critical_total,
  COUNT(CASE WHEN urgency = 'HIGH' AND status = 'APPROVED' THEN 1 END) as high_approved,
  COUNT(CASE WHEN urgency = 'HIGH' THEN 1 END) as high_total,
  
  -- Response time metrics
  AVG(EXTRACT(EPOCH FROM (responded_at - created_at))/3600) as avg_response_hours,
  COUNT(DISTINCT responded_by) as unique_responders,
  COUNT(DISTINCT user_id) as unique_requesters
FROM policy_appeals
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY appeal_date DESC;

-- Create function for GA Core appeal metrics
CREATE OR REPLACE FUNCTION get_ga_appeal_metrics(
  p_days_back INTEGER DEFAULT 7
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  total_appeals INTEGER;
  pending_appeals INTEGER;
  sla_compliance_rate DECIMAL(5,4);
  avg_response_hours DECIMAL(8,2);
BEGIN
  -- Get appeal metrics
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN status = 'PENDING' THEN 1 END),
    COALESCE(
      COUNT(CASE WHEN responded_at IS NOT NULL AND responded_at <= sla_deadline THEN 1 END)::DECIMAL /
      NULLIF(COUNT(CASE WHEN responded_at IS NOT NULL THEN 1 END), 0),
      0
    ),
    AVG(EXTRACT(EPOCH FROM (responded_at - created_at))/3600)
  INTO total_appeals, pending_appeals, sla_compliance_rate, avg_response_hours
  FROM policy_appeals 
  WHERE created_at >= NOW() - (p_days_back || ' days')::INTERVAL;
  
  -- Build result JSON
  result := jsonb_build_object(
    'total_appeals', total_appeals,
    'pending_appeals', pending_appeals,
    'sla_compliance_rate', sla_compliance_rate,
    'avg_response_hours', avg_response_hours,
    'ga_sla_threshold', 0.90, -- GA Core requires 90% SLA compliance
    'meets_sla_threshold', sla_compliance_rate >= 0.90,
    'days_evaluated', p_days_back,
    'evaluated_at', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to auto-expire old appeals
CREATE OR REPLACE FUNCTION expire_old_appeals() 
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Expire appeals that have been pending beyond escalation deadline
  UPDATE policy_appeals 
  SET status = 'EXPIRED', updated_at = NOW()
  WHERE status = 'PENDING' 
    AND escalation_deadline < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- Revoke expired overrides
  UPDATE policy_overrides
  SET revoked_at = NOW(), revoked_by = 'system', revoke_reason = 'Automatic expiration'
  WHERE expires_at < NOW() AND revoked_at IS NULL;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic SLA deadline calculation
CREATE OR REPLACE FUNCTION set_appeal_deadlines() 
RETURNS TRIGGER AS $$
BEGIN
  -- Set SLA deadline based on urgency
  NEW.sla_deadline := CASE 
    WHEN NEW.urgency = 'CRITICAL' THEN NEW.created_at + INTERVAL '4 hours'
    WHEN NEW.urgency = 'HIGH' THEN NEW.created_at + INTERVAL '12 hours'
    WHEN NEW.urgency = 'MEDIUM' THEN NEW.created_at + INTERVAL '24 hours'
    ELSE NEW.created_at + INTERVAL '48 hours'
  END;
  
  -- Set escalation deadline (2x SLA)
  NEW.escalation_deadline := NEW.sla_deadline + (NEW.sla_deadline - NEW.created_at);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_appeal_deadlines
  BEFORE INSERT ON policy_appeals
  FOR EACH ROW EXECUTE FUNCTION set_appeal_deadlines();

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_policy_appeals_updated_at
  BEFORE UPDATE ON policy_appeals
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Insert sample appeal patterns for testing
INSERT INTO policy_appeals (
  decision_id, user_id, justification, business_need, urgency, status, created_at
) VALUES 
  ('test-decision-1', 'user-1', 'Need urgent access for critical investigation', 'Active security incident requires immediate data access', 'CRITICAL', 'PENDING', NOW() - INTERVAL '2 hours'),
  ('test-decision-2', 'user-2', 'Routine analysis for weekly report', 'Standard business reporting requirements', 'MEDIUM', 'APPROVED', NOW() - INTERVAL '1 day'),
  ('test-decision-3', 'user-3', 'Research query for compliance audit', 'External audit requires historical data review', 'HIGH', 'PENDING', NOW() - INTERVAL '6 hours')
ON CONFLICT DO NOTHING;

-- Add comments
COMMENT ON TABLE policy_appeals IS 'GA Core: Policy appeal requests with SLA tracking and structured workflow';
COMMENT ON TABLE policy_overrides IS 'GA Core: Temporary policy overrides granted through appeal process';
COMMENT ON TABLE policy_decisions_log IS 'GA Core: Complete audit log of all policy decisions and appeal paths';
COMMENT ON VIEW policy_appeal_analytics IS 'GA Core: Appeal process analytics for Go/No-Go dashboard';
COMMENT ON FUNCTION get_ga_appeal_metrics IS 'GA Core: Appeal system metrics for GA gate evaluation';