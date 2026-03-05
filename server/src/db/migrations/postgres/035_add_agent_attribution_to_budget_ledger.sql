-- Migration: Add Agent Attribution to Budget Ledger
-- Date: 2026-03-04
-- Phase 3: Cost & Observability

-- Add columns to budget_ledger
ALTER TABLE budget_ledger ADD COLUMN IF NOT EXISTS agent_id VARCHAR(255);
ALTER TABLE budget_ledger ADD COLUMN IF NOT EXISTS agent_version VARCHAR(50);

-- Index for agent-based cost analysis
CREATE INDEX IF NOT EXISTS idx_budget_ledger_agent ON budget_ledger(agent_id, tenant_id);

-- Update record_spending function to handle new agent fields
-- Note: This is an idempotent replacement if the function already exists
CREATE OR REPLACE FUNCTION record_spending(
    p_tenant_id VARCHAR,
    p_correlation_id VARCHAR,
    p_operation_name VARCHAR,
    p_field_name VARCHAR,
    p_user_id VARCHAR,
    p_provider VARCHAR,
    p_model VARCHAR,
    p_est_prompt_tokens INTEGER,
    p_est_completion_tokens INTEGER,
    p_est_total_usd DECIMAL,
    p_estimation_method VARCHAR,
    p_agent_id VARCHAR DEFAULT NULL,
    p_agent_version VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO budget_ledger (
        tenant_id,
        correlation_id,
        operation_name,
        field_name,
        user_id,
        provider,
        model,
        est_prompt_tokens,
        est_completion_tokens,
        est_total_usd,
        estimation_method,
        agent_id,
        agent_version,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_tenant_id,
        p_correlation_id,
        p_operation_name,
        p_field_name,
        p_user_id,
        p_provider,
        p_model,
        p_est_prompt_tokens,
        p_est_completion_tokens,
        p_est_total_usd,
        p_estimation_method,
        p_agent_id,
        p_agent_version,
        'estimated',
        NOW(),
        NOW()
    ) RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;
