-- Admin Panel Schema Extensions
-- Migration: 2025-11-20_admin_panel_schema.sql
-- Purpose: Add comprehensive admin functionality for user management, audit logs, and content moderation

-- ============================================================================
-- USER MANAGEMENT EXTENSIONS
-- ============================================================================

-- Add admin-specific fields to users table (if not already present)
DO $$
BEGIN
  -- Add role if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'VIEWER';
  END IF;

  -- Add is_active if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
    ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
  END IF;

  -- Add suspension fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_suspended') THEN
    ALTER TABLE users ADD COLUMN is_suspended BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'suspended_at') THEN
    ALTER TABLE users ADD COLUMN suspended_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'suspended_by') THEN
    ALTER TABLE users ADD COLUMN suspended_by UUID REFERENCES users(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'suspension_reason') THEN
    ALTER TABLE users ADD COLUMN suspension_reason TEXT;
  END IF;

  -- Add last login tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login') THEN
    ALTER TABLE users ADD COLUMN last_login TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login_ip') THEN
    ALTER TABLE users ADD COLUMN last_login_ip INET;
  END IF;

  -- Add profile fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
    ALTER TABLE users ADD COLUMN username TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name') THEN
    ALTER TABLE users ADD COLUMN first_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name') THEN
    ALTER TABLE users ADD COLUMN last_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar_url') THEN
    ALTER TABLE users ADD COLUMN avatar_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'metadata') THEN
    ALTER TABLE users ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create index on role for fast filtering
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_is_suspended ON users(is_suspended);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login DESC);

-- ============================================================================
-- USER IMPERSONATION TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_impersonations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES users(id),
  target_user_id UUID NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_impersonations_admin ON user_impersonations(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonations_target ON user_impersonations(target_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonations_active ON user_impersonations(started_at, ended_at) WHERE ended_at IS NULL;

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'success', -- success, failure, error
  error_message TEXT,
  tenant_id TEXT,
  session_id TEXT,
  request_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_details ON audit_logs USING gin(details);

-- Partition audit logs by month for better performance (optional, can be enabled later)
-- CREATE TABLE audit_logs_2025_11 PARTITION OF audit_logs FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- ============================================================================
-- CONTENT MODERATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS moderation_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type TEXT NOT NULL, -- entity, relationship, investigation, comment, etc.
  content_id UUID NOT NULL,
  reporter_user_id UUID REFERENCES users(id),
  reason TEXT NOT NULL,
  category TEXT NOT NULL, -- abuse, spam, inappropriate, violation, other
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, escalated
  priority TEXT NOT NULL DEFAULT 'normal', -- low, normal, high, critical
  assigned_to UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  resolution TEXT,
  action_taken TEXT, -- no_action, content_removed, user_warned, user_suspended, etc.
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_status ON moderation_queue(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_content ON moderation_queue(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_moderation_reporter ON moderation_queue(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_assigned ON moderation_queue(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_moderation_priority ON moderation_queue(priority, status, created_at DESC);

-- ============================================================================
-- FEATURE FLAGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  flag_type TEXT NOT NULL DEFAULT 'boolean', -- boolean, string, number, json
  default_value JSONB NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  target_users TEXT[], -- Array of user IDs for targeted rollout
  target_roles TEXT[], -- Array of roles for targeted rollout
  target_tenants TEXT[], -- Array of tenant IDs for targeted rollout
  conditions JSONB DEFAULT '{}'::jsonb,
  tags TEXT[],
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled);
CREATE INDEX IF NOT EXISTS idx_feature_flags_tags ON feature_flags USING gin(tags);

-- Feature flag history for audit trail
CREATE TABLE IF NOT EXISTS feature_flag_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES users(id),
  field_name TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flag_history_flag ON feature_flag_history(flag_id, created_at DESC);

-- ============================================================================
-- SYSTEM METRICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_type TEXT NOT NULL, -- counter, gauge, histogram
  labels JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_tenant ON system_metrics(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_labels ON system_metrics USING gin(labels);

-- ============================================================================
-- ADMIN ALERTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type TEXT NOT NULL, -- security, performance, error, warning, info
  severity TEXT NOT NULL DEFAULT 'info', -- critical, high, medium, low, info
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  source TEXT NOT NULL, -- system, monitoring, user_report, automated
  resource_type TEXT,
  resource_id TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, acknowledged, resolved, dismissed
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_status ON admin_alerts(status, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_type ON admin_alerts(alert_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_severity ON admin_alerts(severity, created_at DESC);

-- ============================================================================
-- DATA EXPORTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  export_type TEXT NOT NULL, -- users, audit_logs, entities, investigations, full_backup
  format TEXT NOT NULL DEFAULT 'json', -- json, csv, xlsx, pdf
  filters JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  requested_by UUID NOT NULL REFERENCES users(id),
  file_url TEXT,
  file_size_bytes BIGINT,
  record_count INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_exports_user ON data_exports(requested_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_exports_status ON data_exports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_exports_expires ON data_exports(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- SYSTEM CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  config_type TEXT NOT NULL, -- string, number, boolean, json, array
  category TEXT NOT NULL, -- security, features, limits, integrations, ui
  description TEXT,
  is_sensitive BOOLEAN NOT NULL DEFAULT false,
  validation_schema JSONB,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);

-- Configuration change history
CREATE TABLE IF NOT EXISTS system_config_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_id UUID NOT NULL REFERENCES system_config(id) ON DELETE CASCADE,
  old_value JSONB,
  new_value JSONB,
  changed_by UUID REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_config_history_config ON system_config_history(config_id, created_at DESC);

-- ============================================================================
-- ADMIN ACTIVITY LOG (for admin actions specifically)
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT, -- user, config, flag, export, etc.
  target_id TEXT,
  changes JSONB DEFAULT '{}'::jsonb,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_admin ON admin_activity_log(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_action ON admin_activity_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_target ON admin_activity_log(target_type, target_id, created_at DESC);

-- ============================================================================
-- VIEWS FOR ADMIN DASHBOARD
-- ============================================================================

-- Active users summary
CREATE OR REPLACE VIEW admin_users_summary AS
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_active = true) as active_users,
  COUNT(*) FILTER (WHERE is_suspended = true) as suspended_users,
  COUNT(*) FILTER (WHERE role = 'ADMIN') as admin_users,
  COUNT(*) FILTER (WHERE role = 'ANALYST') as analyst_users,
  COUNT(*) FILTER (WHERE role = 'VIEWER') as viewer_users,
  COUNT(*) FILTER (WHERE last_login > NOW() - INTERVAL '24 hours') as active_today,
  COUNT(*) FILTER (WHERE last_login > NOW() - INTERVAL '7 days') as active_this_week,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_this_month
FROM users;

-- Audit log summary
CREATE OR REPLACE VIEW admin_audit_summary AS
SELECT
  DATE_TRUNC('day', timestamp) as date,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE status = 'success') as successful_events,
  COUNT(*) FILTER (WHERE status = 'failure') as failed_events,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT action) as unique_actions
FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', timestamp)
ORDER BY date DESC;

-- Moderation queue summary
CREATE OR REPLACE VIEW admin_moderation_summary AS
SELECT
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_items,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_items,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_items,
  COUNT(*) FILTER (WHERE priority = 'critical') as critical_items,
  COUNT(*) FILTER (WHERE priority = 'high') as high_priority_items,
  AVG(EXTRACT(EPOCH FROM (COALESCE(reviewed_at, NOW()) - created_at))) as avg_resolution_time_seconds
FROM moderation_queue;

-- System alerts summary
CREATE OR REPLACE VIEW admin_alerts_summary AS
SELECT
  COUNT(*) as total_alerts,
  COUNT(*) FILTER (WHERE status = 'active') as active_alerts,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_alerts,
  COUNT(*) FILTER (WHERE severity = 'high') as high_severity_alerts,
  COUNT(*) FILTER (WHERE alert_type = 'security') as security_alerts,
  COUNT(*) FILTER (WHERE alert_type = 'performance') as performance_alerts
FROM admin_alerts
WHERE created_at > NOW() - INTERVAL '7 days';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb,
  p_ip_address INET DEFAULT NULL,
  p_status TEXT DEFAULT 'success'
) RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, status)
  VALUES (p_user_id, p_action, p_resource_type, p_resource_id, p_details, p_ip_address, p_status)
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- Function to suspend user
CREATE OR REPLACE FUNCTION suspend_user(
  p_user_id UUID,
  p_suspended_by UUID,
  p_reason TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users
  SET
    is_suspended = true,
    suspended_at = NOW(),
    suspended_by = p_suspended_by,
    suspension_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_user_id;

  PERFORM log_audit_event(
    p_suspended_by,
    'user.suspend',
    'user',
    p_user_id::TEXT,
    jsonb_build_object('reason', p_reason)
  );

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to unsuspend user
CREATE OR REPLACE FUNCTION unsuspend_user(
  p_user_id UUID,
  p_unsuspended_by UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users
  SET
    is_suspended = false,
    suspended_at = NULL,
    suspended_by = NULL,
    suspension_reason = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;

  PERFORM log_audit_event(
    p_unsuspended_by,
    'user.unsuspend',
    'user',
    p_user_id::TEXT
  );

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default system configurations
INSERT INTO system_config (config_key, config_value, config_type, category, description)
VALUES
  ('max_login_attempts', '5', 'number', 'security', 'Maximum failed login attempts before account lockout'),
  ('session_timeout_minutes', '60', 'number', 'security', 'Session timeout in minutes'),
  ('password_min_length', '8', 'number', 'security', 'Minimum password length'),
  ('require_mfa', 'false', 'boolean', 'security', 'Require multi-factor authentication for all users'),
  ('max_export_records', '100000', 'number', 'limits', 'Maximum number of records per export'),
  ('export_expiry_hours', '24', 'number', 'limits', 'Hours until export files expire'),
  ('moderation_auto_assign', 'true', 'boolean', 'features', 'Automatically assign moderation items to available admins'),
  ('audit_retention_days', '365', 'number', 'security', 'Days to retain audit logs'),
  ('enable_impersonation', 'true', 'boolean', 'features', 'Enable admin user impersonation'),
  ('max_concurrent_sessions', '3', 'number', 'security', 'Maximum concurrent sessions per user')
ON CONFLICT (config_key) DO NOTHING;

-- Create audit log entry for migration
INSERT INTO audit_logs (user_id, action, resource_type, details, status)
VALUES (NULL, 'schema.migration', 'database', '{"migration": "2025-11-20_admin_panel_schema"}'::jsonb, 'success');

COMMENT ON TABLE audit_logs IS 'Comprehensive audit log for all user and system actions';
COMMENT ON TABLE user_impersonations IS 'Tracking of admin user impersonation sessions';
COMMENT ON TABLE moderation_queue IS 'Content moderation queue for flagged items';
COMMENT ON TABLE feature_flags IS 'Feature flag configuration and management';
COMMENT ON TABLE system_metrics IS 'System performance and usage metrics';
COMMENT ON TABLE admin_alerts IS 'System alerts for administrators';
COMMENT ON TABLE data_exports IS 'Data export requests and status';
COMMENT ON TABLE system_config IS 'System-wide configuration settings';
COMMENT ON TABLE admin_activity_log IS 'Detailed log of administrative actions';
