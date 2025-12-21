
-- Update notifications table to support new requirements
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Ensure tenant_id is indexed
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_user_unread ON notifications(tenant_id, user_id) WHERE read_at IS NULL;

-- Create new preferences table for granular type-based settings
CREATE TABLE IF NOT EXISTS notification_type_preferences (
    user_id VARCHAR(255) NOT NULL,
    tenant_id UUID NOT NULL,
    type VARCHAR(255) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, tenant_id, type)
);
