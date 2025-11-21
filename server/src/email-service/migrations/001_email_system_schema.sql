-- Email System Database Schema
-- PostgreSQL migration for email template system

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    version VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true,
    mjml_content TEXT,
    react_email_component TEXT,
    preview_text VARCHAR(255),
    tags TEXT[], -- Array of tags
    metadata JSONB,

    INDEX idx_email_templates_category (category),
    INDEX idx_email_templates_active (active),
    INDEX idx_email_templates_created_at (created_at)
);

-- Template Variables Table
CREATE TABLE IF NOT EXISTS email_template_variables (
    id SERIAL PRIMARY KEY,
    template_id VARCHAR(255) NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- string, number, boolean, date, url, object
    required BOOLEAN DEFAULT false,
    default_value TEXT,
    description TEXT,
    example TEXT,

    UNIQUE(template_id, name),
    INDEX idx_template_variables_template_id (template_id)
);

-- Template Variants Table (for A/B testing)
CREATE TABLE IF NOT EXISTS email_template_variants (
    id VARCHAR(255) PRIMARY KEY,
    template_id VARCHAR(255) NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    weight INTEGER NOT NULL DEFAULT 50, -- Percentage (0-100)
    subject VARCHAR(500),
    mjml_content TEXT,
    react_email_component TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true,

    INDEX idx_template_variants_template_id (template_id),
    INDEX idx_template_variants_active (active)
);

-- Template Versions Table
CREATE TABLE IF NOT EXISTS email_template_versions (
    id VARCHAR(255) PRIMARY KEY,
    template_id VARCHAR(255) NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    mjml_content TEXT,
    react_email_component TEXT,
    variables JSONB,
    change_log TEXT,
    tags TEXT[],
    active BOOLEAN DEFAULT true,
    deployed_at TIMESTAMP WITH TIME ZONE,
    deprecated BOOLEAN DEFAULT false,
    deprecated_at TIMESTAMP WITH TIME ZONE,
    deprecation_reason TEXT,

    UNIQUE(template_id, version),
    INDEX idx_template_versions_template_id (template_id),
    INDEX idx_template_versions_created_at (created_at),
    INDEX idx_template_versions_active (active)
);

-- Email Send Log Table
CREATE TABLE IF NOT EXISTS email_send_log (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(255) UNIQUE NOT NULL,
    template_id VARCHAR(255) REFERENCES email_templates(id),
    template_version VARCHAR(20),
    ab_test_variant_id VARCHAR(255),
    recipient_email VARCHAR(255) NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'sent', -- sent, bounced, failed
    error_message TEXT,
    provider VARCHAR(50), -- smtp, sendgrid, aws-ses, etc.
    priority VARCHAR(10), -- high, normal, low
    metadata JSONB,

    INDEX idx_email_log_message_id (message_id),
    INDEX idx_email_log_recipient (recipient_email),
    INDEX idx_email_log_template_id (template_id),
    INDEX idx_email_log_sent_at (sent_at),
    INDEX idx_email_log_status (status)
);

-- Email Analytics Table
CREATE TABLE IF NOT EXISTS email_analytics (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(255) NOT NULL REFERENCES email_send_log(message_id) ON DELETE CASCADE,
    template_id VARCHAR(255) REFERENCES email_templates(id),
    recipient_email VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Open tracking
    opened BOOLEAN DEFAULT false,
    opened_at TIMESTAMP WITH TIME ZONE,
    open_count INTEGER DEFAULT 0,

    -- Click tracking
    clicked BOOLEAN DEFAULT false,
    clicked_at TIMESTAMP WITH TIME ZONE,
    click_count INTEGER DEFAULT 0,
    clicked_links TEXT[], -- Array of clicked URLs

    -- Bounce tracking
    bounced BOOLEAN DEFAULT false,
    bounced_at TIMESTAMP WITH TIME ZONE,
    bounce_type VARCHAR(20), -- hard, soft, complaint
    bounce_reason TEXT,

    -- Unsubscribe tracking
    unsubscribed BOOLEAN DEFAULT false,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,

    -- Additional metadata
    user_agent TEXT,
    ip_address INET,
    metadata JSONB,

    UNIQUE(message_id),
    INDEX idx_analytics_message_id (message_id),
    INDEX idx_analytics_template_id (template_id),
    INDEX idx_analytics_recipient (recipient_email),
    INDEX idx_analytics_opened (opened),
    INDEX idx_analytics_clicked (clicked),
    INDEX idx_analytics_sent_at (sent_at)
);

-- Unsubscribe Preferences Table
CREATE TABLE IF NOT EXISTS email_unsubscribe_preferences (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,

    -- Global unsubscribe
    unsubscribed_from_all BOOLEAN DEFAULT false,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,

    -- Category preferences (JSONB for flexibility)
    categories JSONB DEFAULT '{}',

    -- Frequency preferences
    max_emails_per_day INTEGER,
    max_emails_per_week INTEGER,
    digest_enabled BOOLEAN DEFAULT false,
    digest_frequency VARCHAR(20), -- daily, weekly, monthly

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,

    INDEX idx_unsubscribe_email (email),
    INDEX idx_unsubscribe_user_id (user_id),
    INDEX idx_unsubscribe_all (unsubscribed_from_all)
);

-- A/B Test Configurations Table
CREATE TABLE IF NOT EXISTS email_ab_tests (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    template_id VARCHAR(255) NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
    active BOOLEAN DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    goal_metric VARCHAR(50) NOT NULL, -- open-rate, click-rate, conversion-rate, custom
    goal_value NUMERIC(10, 2),
    traffic_percentage INTEGER DEFAULT 100, -- Percentage (0-100)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,

    INDEX idx_ab_tests_template_id (template_id),
    INDEX idx_ab_tests_active (active),
    INDEX idx_ab_tests_start_date (start_date)
);

-- A/B Test Variants Table
CREATE TABLE IF NOT EXISTS email_ab_test_variants (
    id VARCHAR(255) PRIMARY KEY,
    test_id VARCHAR(255) NOT NULL REFERENCES email_ab_tests(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    template_variant_id VARCHAR(255) NOT NULL REFERENCES email_template_variants(id),
    weight INTEGER NOT NULL DEFAULT 50, -- Percentage (0-100)

    -- Statistics
    sent INTEGER DEFAULT 0,
    opened INTEGER DEFAULT 0,
    clicked INTEGER DEFAULT 0,
    converted INTEGER DEFAULT 0,
    bounced INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(test_id, name),
    INDEX idx_ab_variants_test_id (test_id)
);

-- Email Queue Jobs Table (for reference, actual queue in Redis)
CREATE TABLE IF NOT EXISTS email_queue_jobs (
    id VARCHAR(255) PRIMARY KEY,
    message JSONB NOT NULL,
    priority INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, sent, failed, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    metadata JSONB,

    INDEX idx_queue_status (status),
    INDEX idx_queue_scheduled_for (scheduled_for),
    INDEX idx_queue_created_at (created_at)
);

-- Email Deliverability Reports Table
CREATE TABLE IF NOT EXISTS email_deliverability_reports (
    id SERIAL PRIMARY KEY,
    template_id VARCHAR(255) REFERENCES email_templates(id),
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    spam_score NUMERIC(5, 2) NOT NULL,
    spam_score_passed BOOLEAN NOT NULL,
    overall_score INTEGER NOT NULL, -- 0-100

    -- Authentication checks
    spf_configured BOOLEAN,
    dkim_configured BOOLEAN,
    dmarc_configured BOOLEAN,

    -- Content analysis
    text_to_html_ratio NUMERIC(5, 2),
    word_count INTEGER,
    link_count INTEGER,
    image_count INTEGER,
    has_unsubscribe_link BOOLEAN,
    has_physical_address BOOLEAN,

    -- Issues and recommendations
    issues JSONB,
    recommendations TEXT[],

    metadata JSONB,

    INDEX idx_deliverability_template_id (template_id),
    INDEX idx_deliverability_checked_at (checked_at),
    INDEX idx_deliverability_spam_score (spam_score)
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unsubscribe_preferences_updated_at BEFORE UPDATE ON email_unsubscribe_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_tests_updated_at BEFORE UPDATE ON email_ab_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_variants_updated_at BEFORE UPDATE ON email_ab_test_variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries

-- View: Email performance summary by template
CREATE OR REPLACE VIEW v_email_template_performance AS
SELECT
    t.id AS template_id,
    t.name AS template_name,
    t.category,
    COUNT(DISTINCT a.message_id) AS total_sent,
    SUM(CASE WHEN a.opened THEN 1 ELSE 0 END) AS total_opened,
    SUM(CASE WHEN a.clicked THEN 1 ELSE 0 END) AS total_clicked,
    SUM(CASE WHEN a.bounced THEN 1 ELSE 0 END) AS total_bounced,
    ROUND(100.0 * SUM(CASE WHEN a.opened THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT a.message_id), 0), 2) AS open_rate,
    ROUND(100.0 * SUM(CASE WHEN a.clicked THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT a.message_id), 0), 2) AS click_rate,
    ROUND(100.0 * SUM(CASE WHEN a.bounced THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT a.message_id), 0), 2) AS bounce_rate
FROM email_templates t
LEFT JOIN email_analytics a ON t.id = a.template_id
GROUP BY t.id, t.name, t.category;

-- View: Recent email activity
CREATE OR REPLACE VIEW v_recent_email_activity AS
SELECT
    l.message_id,
    l.template_id,
    t.name AS template_name,
    l.recipient_email,
    l.subject,
    l.sent_at,
    l.status,
    a.opened,
    a.clicked,
    a.bounced
FROM email_send_log l
LEFT JOIN email_templates t ON l.template_id = t.id
LEFT JOIN email_analytics a ON l.message_id = a.message_id
ORDER BY l.sent_at DESC
LIMIT 1000;

-- Grant permissions (adjust based on your user setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT SELECT ON ALL VIEWS IN SCHEMA public TO your_app_user;

-- Comments for documentation
COMMENT ON TABLE email_templates IS 'Stores email template definitions';
COMMENT ON TABLE email_template_variables IS 'Defines required and optional variables for each template';
COMMENT ON TABLE email_template_variants IS 'Stores A/B test variants for templates';
COMMENT ON TABLE email_template_versions IS 'Version history for templates with rollback capability';
COMMENT ON TABLE email_send_log IS 'Logs all email send attempts';
COMMENT ON TABLE email_analytics IS 'Tracks email engagement metrics (opens, clicks, bounces)';
COMMENT ON TABLE email_unsubscribe_preferences IS 'Manages user unsubscribe preferences and frequency limits';
COMMENT ON TABLE email_ab_tests IS 'Configures A/B tests for email campaigns';
COMMENT ON TABLE email_ab_test_variants IS 'Tracks statistics for each A/B test variant';
COMMENT ON TABLE email_deliverability_reports IS 'Stores spam score and deliverability check results';
