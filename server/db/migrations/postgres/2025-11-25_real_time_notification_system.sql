-- Real-Time Notification System
-- Migration: 2025-11-25_real_time_notification_system
-- Description: Add real-time notification delivery infrastructure
--              for audit events and compliance alerts

-- ============================================================================
-- NOTIFICATION PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,

  -- Event filters
  event_types TEXT[], -- NULL = all events
  severity_threshold TEXT NOT NULL DEFAULT 'warn'
    CHECK (severity_threshold IN ('debug', 'info', 'warn', 'error', 'critical')),
  resource_types TEXT[], -- Filter by resource type (e.g., ['entity', 'relationship'])
  tags TEXT[], -- Filter by event tags

  -- Channel configuration (JSONB for flexibility)
  channels JSONB NOT NULL DEFAULT '{"websocket": true, "email": false, "slack": false, "webhook": false}'::jsonb,

  -- Email settings
  email_address VARCHAR(255),
  email_digest_frequency TEXT DEFAULT 'immediate'
    CHECK (email_digest_frequency IN ('immediate', 'hourly', 'daily', 'never')),

  -- Slack settings
  slack_webhook_url TEXT,
  slack_channel VARCHAR(100),
  slack_username VARCHAR(100) DEFAULT 'IntelGraph Audit Bot',

  -- Webhook settings
  webhook_url TEXT,
  webhook_secret TEXT, -- For HMAC signature verification
  webhook_headers JSONB, -- Custom headers as key-value pairs

  -- Throttling configuration
  max_notifications_per_hour INTEGER DEFAULT 100
    CHECK (max_notifications_per_hour > 0 AND max_notifications_per_hour <= 1000),
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_timezone VARCHAR(50) DEFAULT 'UTC',

  -- Status
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_notified_at TIMESTAMPTZ,

  -- Audit metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by VARCHAR(255),

  -- Constraints
  UNIQUE(user_id, tenant_id),
  CHECK (
    (channels->>'email')::boolean = false OR email_address IS NOT NULL
  ),
  CHECK (
    (channels->>'slack')::boolean = false OR slack_webhook_url IS NOT NULL
  ),
  CHECK (
    (channels->>'webhook')::boolean = false OR webhook_url IS NOT NULL
  )
);

CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id) WHERE enabled = true;
CREATE INDEX idx_notification_preferences_tenant ON notification_preferences(tenant_id) WHERE enabled = true;
CREATE INDEX idx_notification_preferences_enabled ON notification_preferences(enabled, user_id);

COMMENT ON TABLE notification_preferences IS 'User notification preferences for audit events';
COMMENT ON COLUMN notification_preferences.severity_threshold IS 'Minimum severity level to trigger notifications';
COMMENT ON COLUMN notification_preferences.channels IS 'Enabled notification channels as JSON object';
COMMENT ON COLUMN notification_preferences.webhook_secret IS 'Secret for HMAC-SHA256 signature on webhooks';

-- ============================================================================
-- NOTIFICATION DELIVERY LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to audit event
  audit_event_id UUID NOT NULL,
  correlation_id VARCHAR(255), -- For grouping related notifications
  batch_id UUID, -- For digest/batch notifications

  -- Recipient
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,

  -- Delivery details
  channel TEXT NOT NULL
    CHECK (channel IN ('websocket', 'email', 'slack', 'webhook', 'sms')),
  destination TEXT, -- Email address, Slack channel, webhook URL, phone number

  -- Calculated severity (may differ from audit event severity)
  notification_severity TEXT NOT NULL
    CHECK (notification_severity IN ('low', 'medium', 'high', 'critical', 'emergency')),

  -- Notification content
  notification_title VARCHAR(500) NOT NULL,
  notification_body TEXT NOT NULL,
  notification_data JSONB, -- Additional structured data
  template_id UUID, -- Reference to notification_templates

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'throttled', 'read', 'acknowledged')),
  error_message TEXT,
  error_code VARCHAR(50),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Delivery metadata
  delivery_metadata JSONB, -- Channel-specific delivery info (e.g., Slack message ID, email message ID)

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by VARCHAR(255),
  acknowledgement_note TEXT,

  -- Performance tracking
  processing_duration_ms INTEGER,
  delivery_duration_ms INTEGER,

  -- Constraint: audit_event_id must reference audit_events table
  -- Note: Using conditional FK as audit_events may be in TimescaleDB
  CHECK (audit_event_id IS NOT NULL)
);

-- Indexes for query performance
CREATE INDEX idx_notification_delivery_user ON notification_delivery_log(user_id, created_at DESC);
CREATE INDEX idx_notification_delivery_tenant ON notification_delivery_log(tenant_id, created_at DESC);
CREATE INDEX idx_notification_delivery_status ON notification_delivery_log(status, created_at DESC);
CREATE INDEX idx_notification_delivery_audit_event ON notification_delivery_log(audit_event_id);
CREATE INDEX idx_notification_delivery_channel ON notification_delivery_log(channel, status);
CREATE INDEX idx_notification_delivery_unread ON notification_delivery_log(user_id, read_at)
  WHERE read_at IS NULL AND status IN ('sent', 'delivered');
CREATE INDEX idx_notification_delivery_correlation ON notification_delivery_log(correlation_id)
  WHERE correlation_id IS NOT NULL;
CREATE INDEX idx_notification_delivery_batch ON notification_delivery_log(batch_id)
  WHERE batch_id IS NOT NULL;

COMMENT ON TABLE notification_delivery_log IS 'Audit trail of all notification deliveries';
COMMENT ON COLUMN notification_delivery_log.notification_severity IS 'Calculated notification severity (may differ from audit event level)';
COMMENT ON COLUMN notification_delivery_log.correlation_id IS 'Groups related notifications (e.g., investigation activity)';
COMMENT ON COLUMN notification_delivery_log.batch_id IS 'Groups notifications sent as a batch/digest';

-- ============================================================================
-- NOTIFICATION TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template identification
  template_name VARCHAR(100) NOT NULL,
  event_type TEXT NOT NULL, -- Match audit event type
  channel TEXT NOT NULL
    CHECK (channel IN ('email', 'slack', 'websocket', 'webhook', 'sms')),
  tenant_id VARCHAR(255), -- NULL for system-wide templates
  locale VARCHAR(10) DEFAULT 'en-US', -- For internationalization

  -- Template content (Handlebars syntax)
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,

  -- Email-specific templates
  subject_template TEXT,
  html_template TEXT,
  text_template TEXT, -- Plain text version

  -- Slack-specific
  slack_blocks JSONB, -- Slack Block Kit JSON

  -- Webhook payload template
  webhook_payload_template JSONB,

  -- Template metadata
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by VARCHAR(255),

  UNIQUE(template_name, channel, tenant_id, locale)
);

CREATE INDEX idx_notification_templates_event_channel ON notification_templates(event_type, channel, tenant_id)
  WHERE active = true;
CREATE INDEX idx_notification_templates_tenant ON notification_templates(tenant_id);

COMMENT ON TABLE notification_templates IS 'Notification message templates with Handlebars syntax';
COMMENT ON COLUMN notification_templates.slack_blocks IS 'Slack Block Kit JSON for rich Slack messages';
COMMENT ON COLUMN notification_templates.locale IS 'Locale for internationalized templates';

-- ============================================================================
-- NOTIFICATION THROTTLING STATE (Redis-like state in PostgreSQL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_throttling_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Throttling key (e.g., "rate:user123:email" or "dedup:user123:entity_create")
  throttling_key VARCHAR(500) NOT NULL UNIQUE,

  -- State data
  counter INTEGER DEFAULT 0,
  first_occurrence TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_occurrence TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- TTL for cleanup
  expires_at TIMESTAMPTZ NOT NULL,

  -- Metadata
  metadata JSONB
);

CREATE INDEX idx_notification_throttling_expires ON notification_throttling_state(expires_at);

COMMENT ON TABLE notification_throttling_state IS 'Throttling state for rate limiting and deduplication';
COMMENT ON COLUMN notification_throttling_state.throttling_key IS 'Unique key for throttling (e.g., rate:user:channel or dedup:user:event)';

-- Cleanup expired throttling state (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_throttling_state()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notification_throttling_state
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- NOTIFICATION ROLE-BASED DEFAULTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_role_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Role identification
  role_name VARCHAR(100) NOT NULL,
  tenant_id VARCHAR(255), -- NULL for system-wide defaults

  -- Default preferences (inherit structure from notification_preferences)
  default_event_types TEXT[],
  default_severity_threshold TEXT NOT NULL DEFAULT 'warn',
  default_channels JSONB NOT NULL DEFAULT '{"websocket": true, "email": false, "slack": false}'::jsonb,
  default_email_digest_frequency TEXT DEFAULT 'daily',

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(role_name, tenant_id)
);

CREATE INDEX idx_notification_role_defaults_role ON notification_role_defaults(role_name);

COMMENT ON TABLE notification_role_defaults IS 'Default notification preferences by role';

-- ============================================================================
-- NOTIFICATION STATISTICS (Materialized View)
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS notification_statistics AS
SELECT
  DATE_TRUNC('hour', created_at) as time_bucket,
  channel,
  status,
  notification_severity,
  COUNT(*) as notification_count,
  AVG(processing_duration_ms) as avg_processing_duration_ms,
  AVG(delivery_duration_ms) as avg_delivery_duration_ms,
  SUM(CASE WHEN retry_count > 0 THEN 1 ELSE 0 END) as retry_count_total
FROM notification_delivery_log
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY 1, 2, 3, 4;

CREATE UNIQUE INDEX idx_notification_statistics_unique ON notification_statistics(time_bucket, channel, status, notification_severity);

COMMENT ON MATERIALIZED VIEW notification_statistics IS 'Hourly notification statistics for monitoring and analytics';

-- Refresh function (call from cron or scheduler)
CREATE OR REPLACE FUNCTION refresh_notification_statistics()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY notification_statistics;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id VARCHAR(255))
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM notification_delivery_log
    WHERE user_id = p_user_id
      AND read_at IS NULL
      AND status IN ('sent', 'delivered')
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_unread_notification_count IS 'Get count of unread notifications for a user';

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
  p_notification_id UUID,
  p_user_id VARCHAR(255)
)
RETURNS BOOLEAN AS $$
DECLARE
  updated BOOLEAN;
BEGIN
  UPDATE notification_delivery_log
  SET
    read_at = NOW(),
    status = CASE
      WHEN status = 'delivered' THEN 'read'
      ELSE status
    END
  WHERE id = p_notification_id
    AND user_id = p_user_id
    AND read_at IS NULL;

  GET DIAGNOSTICS updated = FOUND;
  RETURN updated;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_notification_read IS 'Mark a notification as read';

-- Function to acknowledge critical notification
CREATE OR REPLACE FUNCTION acknowledge_notification(
  p_notification_id UUID,
  p_user_id VARCHAR(255),
  p_acknowledgement_note TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  updated BOOLEAN;
BEGIN
  UPDATE notification_delivery_log
  SET
    acknowledged_at = NOW(),
    acknowledged_by = p_user_id,
    acknowledgement_note = p_acknowledgement_note,
    status = 'acknowledged'
  WHERE id = p_notification_id
    AND user_id = p_user_id
    AND acknowledged_at IS NULL;

  GET DIAGNOSTICS updated = FOUND;
  RETURN updated;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION acknowledge_notification IS 'Acknowledge a critical notification with optional note';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

CREATE TRIGGER trg_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- ============================================================================
-- POSTGRESQL NOTIFY TRIGGER (for real-time event streaming)
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_audit_event_created()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
BEGIN
  -- Build notification payload
  payload = jsonb_build_object(
    'eventId', NEW.id,
    'eventType', NEW.event_type,
    'severity', NEW.level,
    'tenantId', NEW.tenant_id,
    'userId', NEW.user_id,
    'timestamp', NEW.timestamp
  );

  -- Send PostgreSQL notification
  PERFORM pg_notify('audit_event_created', payload::text);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger should be added to the audit_events table
-- Uncomment if audit_events exists in this database
-- CREATE TRIGGER trg_notify_audit_event_created
--   AFTER INSERT ON audit_events
--   FOR EACH ROW
--   EXECUTE FUNCTION notify_audit_event_created();

COMMENT ON FUNCTION notify_audit_event_created IS 'Trigger function to notify audit event creation via PostgreSQL NOTIFY';

-- ============================================================================
-- SEED DATA: Default Templates
-- ============================================================================

-- Security Alert Email Template
INSERT INTO notification_templates (
  template_name,
  event_type,
  channel,
  title_template,
  body_template,
  subject_template,
  html_template,
  description
) VALUES (
  'security_alert_email',
  'security_alert',
  'email',
  'Security Alert: {{event.metadata.alertType}}',
  'A security alert was detected: {{event.metadata.alertDescription}}',
  '[SECURITY ALERT] {{event.metadata.alertType}} - IntelGraph',
  '<html>
    <body style="font-family: Arial, sans-serif; color: #333;">
      <div style="background-color: #f44336; color: white; padding: 20px;">
        <h1>🚨 Security Alert</h1>
      </div>
      <div style="padding: 20px;">
        <h2>{{event.metadata.alertType}}</h2>
        <p><strong>Time:</strong> {{event.timestamp}}</p>
        <p><strong>User:</strong> {{event.user_email}}</p>
        <p><strong>IP Address:</strong> {{event.ip_address}}</p>
        <p><strong>Description:</strong></p>
        <p>{{event.metadata.alertDescription}}</p>
        <hr>
        <p><a href="{{baseUrl}}/audit/{{event.id}}" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Details</a></p>
      </div>
    </body>
  </html>',
  'Email template for security alerts'
) ON CONFLICT (template_name, channel, tenant_id, locale) DO NOTHING;

-- Access Denied Slack Template
INSERT INTO notification_templates (
  template_name,
  event_type,
  channel,
  title_template,
  body_template,
  slack_blocks,
  description
) VALUES (
  'access_denied_slack',
  'access_denied',
  'slack',
  'Access Denied',
  'User {{event.user_email}} was denied access to {{event.resource_type}} {{event.resource_id}}',
  '[
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🚫 Access Denied"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*User:*\n{{event.user_email}}"
        },
        {
          "type": "mrkdwn",
          "text": "*Resource:*\n{{event.resource_type}} `{{event.resource_id}}`"
        },
        {
          "type": "mrkdwn",
          "text": "*Action:*\n{{event.action}}"
        },
        {
          "type": "mrkdwn",
          "text": "*Time:*\n{{event.timestamp}}"
        }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Audit Log"
          },
          "url": "{{baseUrl}}/audit/{{event.id}}"
        }
      ]
    }
  ]',
  'Slack template for access denied events'
) ON CONFLICT (template_name, channel, tenant_id, locale) DO NOTHING;

-- Data Deletion Critical Alert
INSERT INTO notification_templates (
  template_name,
  event_type,
  channel,
  title_template,
  body_template,
  subject_template,
  html_template,
  description
) VALUES (
  'data_deletion_email',
  'data_deletion',
  'email',
  'Critical: Data Deletion Event',
  'Data deletion was performed by {{event.user_email}}',
  '[CRITICAL] Data Deletion - Immediate Review Required',
  '<html>
    <body style="font-family: Arial, sans-serif; color: #333;">
      <div style="background-color: #d32f2f; color: white; padding: 20px;">
        <h1>⚠️ CRITICAL: Data Deletion</h1>
      </div>
      <div style="padding: 20px;">
        <p style="font-size: 16px; color: #d32f2f; font-weight: bold;">
          This is a critical notification requiring immediate review.
        </p>
        <h2>Deletion Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>User:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{event.user_email}}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Resource Type:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{event.resource_type}}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Resource ID:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{event.resource_id}}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Timestamp:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{event.timestamp}}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>IP Address:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{event.ip_address}}</td>
          </tr>
        </table>
        <hr>
        <p><a href="{{baseUrl}}/audit/{{event.id}}" style="background-color: #d32f2f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Deletion Event</a></p>
        <p style="font-size: 12px; color: #666; margin-top: 20px;">
          If you did not expect this deletion, please contact your security team immediately.
        </p>
      </div>
    </body>
  </html>',
  'Email template for data deletion events'
) ON CONFLICT (template_name, channel, tenant_id, locale) DO NOTHING;

-- ============================================================================
-- SEED DATA: Default Role-Based Preferences
-- ============================================================================

-- Security Analyst defaults
INSERT INTO notification_role_defaults (
  role_name,
  default_event_types,
  default_severity_threshold,
  default_channels,
  default_email_digest_frequency
) VALUES (
  'security_analyst',
  ARRAY['security_alert', 'anomaly_detected', 'access_denied', 'suspicious_activity', 'brute_force_detected'],
  'warn',
  '{"websocket": true, "email": true, "slack": true}'::jsonb,
  'immediate'
) ON CONFLICT (role_name, tenant_id) DO NOTHING;

-- Administrator defaults
INSERT INTO notification_role_defaults (
  role_name,
  default_event_types,
  default_severity_threshold,
  default_channels,
  default_email_digest_frequency
) VALUES (
  'admin',
  ARRAY['system_error', 'config_change', 'data_deletion', 'data_breach', 'policy_violation'],
  'error',
  '{"websocket": true, "email": true, "slack": true}'::jsonb,
  'immediate'
) ON CONFLICT (role_name, tenant_id) DO NOTHING;

-- Compliance Officer defaults
INSERT INTO notification_role_defaults (
  role_name,
  default_event_types,
  default_severity_threshold,
  default_channels,
  default_email_digest_frequency
) VALUES (
  'compliance_officer',
  ARRAY['policy_decision', 'policy_violation', 'compliance_check', 'data_export', 'data_deletion'],
  'warn',
  '{"websocket": true, "email": true, "slack": false}'::jsonb,
  'daily'
) ON CONFLICT (role_name, tenant_id) DO NOTHING;

-- Analyst defaults (regular users)
INSERT INTO notification_role_defaults (
  role_name,
  default_event_types,
  default_severity_threshold,
  default_channels,
  default_email_digest_frequency
) VALUES (
  'analyst',
  ARRAY['investigation_share', 'entity_mention', 'relationship_update'],
  'info',
  '{"websocket": true, "email": false, "slack": false}'::jsonb,
  'never'
) ON CONFLICT (role_name, tenant_id) DO NOTHING;

-- ============================================================================
-- GRANTS (adjust based on your role setup)
-- ============================================================================

-- Grant SELECT to application users
-- GRANT SELECT ON notification_preferences TO app_user;
-- GRANT SELECT ON notification_delivery_log TO app_user;
-- GRANT SELECT ON notification_templates TO app_user;
-- GRANT EXECUTE ON FUNCTION get_unread_notification_count TO app_user;
-- GRANT EXECUTE ON FUNCTION mark_notification_read TO app_user;
-- GRANT EXECUTE ON FUNCTION acknowledge_notification TO app_user;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Record migration
-- INSERT INTO schema_migrations (version, name, applied_at)
-- VALUES ('2025-11-25_001', 'real_time_notification_system', NOW())
-- ON CONFLICT DO NOTHING;
