-- Create signed_receipts table for immutable, cryptographically signed receipts
CREATE TABLE IF NOT EXISTS signed_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID NOT NULL,
    tenant_id UUID,
    actor_id VARCHAR(255) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    signature TEXT NOT NULL,
    signed_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Indexes for performance
    INDEX idx_signed_receipts_action_id (action_id),
    INDEX idx_signed_receipts_tenant_id (tenant_id),
    INDEX idx_signed_receipts_actor_id (actor_id),
    INDEX idx_signed_receipts_action_type (action_type)
);
