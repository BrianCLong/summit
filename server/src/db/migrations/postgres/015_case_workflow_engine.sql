-- Case Workflow Engine - Comprehensive case management with workflow, tasks, SLAs, and approvals
-- Extends the existing maestro.cases table with full workflow capabilities

-- ======================
-- 1. EXTEND CASES TABLE
-- ======================

-- Add workflow-specific columns to existing cases table
ALTER TABLE maestro.cases
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  ADD COLUMN IF NOT EXISTS current_stage VARCHAR(100),
  ADD COLUMN IF NOT EXISTS jurisdiction VARCHAR(255),
  ADD COLUMN IF NOT EXISTS authority_reference VARCHAR(500), -- Legal authority or warrant reference
  ADD COLUMN IF NOT EXISTS warrant_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS case_type VARCHAR(100) DEFAULT 'investigation',
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Indexes for new fields
CREATE INDEX IF NOT EXISTS idx_cases_priority ON maestro.cases(priority);
CREATE INDEX IF NOT EXISTS idx_cases_current_stage ON maestro.cases(current_stage);
CREATE INDEX IF NOT EXISTS idx_cases_case_type ON maestro.cases(case_type);
CREATE INDEX IF NOT EXISTS idx_cases_due_date ON maestro.cases(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_tags ON maestro.cases USING GIN(tags);

-- ======================
-- 2. CASE ROLES
-- ======================

CREATE TABLE IF NOT EXISTS maestro.case_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]', -- Array of permission strings
    is_system_role BOOLEAN DEFAULT false, -- System roles like 'investigator', 'analyst', 'approver'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(name)
);

-- System roles (investigator, analyst, approver, reviewer, ombudsman)
INSERT INTO maestro.case_roles (id, name, description, permissions, is_system_role) VALUES
    ('00000000-0000-0000-0000-000000000001', 'investigator', 'Lead investigator with full case access', '["case:read", "case:write", "case:assign", "task:all"]', true),
    ('00000000-0000-0000-0000-000000000002', 'analyst', 'Analyst with read and contribute access', '["case:read", "task:read", "task:write", "task:complete"]', true),
    ('00000000-0000-0000-0000-000000000003', 'approver', 'Approver for 4-eyes rules', '["case:read", "approval:approve", "approval:reject"]', true),
    ('00000000-0000-0000-0000-000000000004', 'reviewer', 'Reviewer with read-only access', '["case:read", "task:read"]', true),
    ('00000000-0000-0000-0000-000000000005', 'ombudsman', 'Compliance/audit role with oversight access', '["case:read", "audit:read", "audit:export"]', true)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_case_roles_name ON maestro.case_roles(name);

-- ======================
-- 3. CASE PARTICIPANTS
-- ======================

CREATE TABLE IF NOT EXISTS maestro.case_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES maestro.cases(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    role_id UUID NOT NULL REFERENCES maestro.case_roles(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by VARCHAR(255),
    removed_at TIMESTAMP WITH TIME ZONE,
    removed_by VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',

    UNIQUE(case_id, user_id, role_id) WHERE is_active = true
);

CREATE INDEX IF NOT EXISTS idx_case_participants_case_id ON maestro.case_participants(case_id);
CREATE INDEX IF NOT EXISTS idx_case_participants_user_id ON maestro.case_participants(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_case_participants_role_id ON maestro.case_participants(role_id);

-- ======================
-- 4. CASE STAGES
-- ======================

CREATE TABLE IF NOT EXISTS maestro.case_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_type VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    is_initial BOOLEAN DEFAULT false,
    is_terminal BOOLEAN DEFAULT false,
    required_role_id UUID REFERENCES maestro.case_roles(id),
    sla_hours INTEGER, -- Default SLA hours for this stage
    allowed_transitions TEXT[], -- Array of stage names that can follow this stage
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(case_type, name),
    UNIQUE(case_type, order_index)
);

-- Default stages for 'investigation' case type
INSERT INTO maestro.case_stages (case_type, name, description, order_index, is_initial, is_terminal, sla_hours, allowed_transitions) VALUES
    ('investigation', 'intake', 'Initial case intake and triage', 1, true, false, 24, '["analysis", "closed"]'),
    ('investigation', 'analysis', 'Active investigation and analysis', 2, false, false, 168, '["review", "escalated", "closed"]'), -- 7 days
    ('investigation', 'review', 'Review and validation', 3, false, false, 48, '["approved", "analysis"]'),
    ('investigation', 'approved', 'Approved for action', 4, false, false, 24, '["completed", "closed"]'),
    ('investigation', 'escalated', 'Escalated for senior review', 5, false, false, 24, '["analysis", "review", "closed"]'),
    ('investigation', 'completed', 'Investigation completed', 6, false, true, NULL, '[]'),
    ('investigation', 'closed', 'Case closed', 7, false, true, NULL, '[]')
ON CONFLICT (case_type, name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_case_stages_case_type ON maestro.case_stages(case_type);
CREATE INDEX IF NOT EXISTS idx_case_stages_order ON maestro.case_stages(case_type, order_index);

-- ======================
-- 5. CASE STATE HISTORY
-- ======================

CREATE TABLE IF NOT EXISTS maestro.case_state_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES maestro.cases(id) ON DELETE CASCADE,
    from_stage VARCHAR(100),
    to_stage VARCHAR(100) NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    transitioned_by VARCHAR(255) NOT NULL,
    transitioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT NOT NULL, -- Reason for transition (audit trail)
    legal_basis VARCHAR(100), -- Legal basis for transition
    metadata JSONB DEFAULT '{}',

    CHECK (from_stage IS NOT NULL OR from_status IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_case_state_history_case_id ON maestro.case_state_history(case_id);
CREATE INDEX IF NOT EXISTS idx_case_state_history_transitioned_at ON maestro.case_state_history(transitioned_at DESC);

-- ======================
-- 6. CASE TASKS
-- ======================

CREATE TABLE IF NOT EXISTS maestro.case_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES maestro.cases(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) DEFAULT 'standard' CHECK (task_type IN ('standard', 'approval', 'review', 'data_collection', 'analysis')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'blocked', 'completed', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    assigned_to VARCHAR(255),
    assigned_by VARCHAR(255),
    assigned_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by VARCHAR(255),
    required_role_id UUID REFERENCES maestro.case_roles(id),
    depends_on_task_ids UUID[], -- Array of task IDs that must be completed first
    result_data JSONB DEFAULT '{}', -- Task completion data/results
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_case_tasks_case_id ON maestro.case_tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_case_tasks_assigned_to ON maestro.case_tasks(assigned_to) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_case_tasks_status ON maestro.case_tasks(status);
CREATE INDEX IF NOT EXISTS idx_case_tasks_due_date ON maestro.case_tasks(due_date) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_case_tasks_task_type ON maestro.case_tasks(task_type);

-- ======================
-- 7. CASE SLAs
-- ======================

CREATE TABLE IF NOT EXISTS maestro.case_slas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES maestro.cases(id) ON DELETE CASCADE,
    sla_type VARCHAR(50) NOT NULL CHECK (sla_type IN ('case_completion', 'stage_completion', 'task_completion', 'first_response')),
    target_entity_id UUID, -- case_id, task_id, or stage transition
    target_hours INTEGER NOT NULL,
    due_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'met', 'breached', 'at_risk', 'cancelled')),
    breached_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    at_risk_threshold_hours INTEGER DEFAULT 4, -- Hours before due to mark as 'at_risk'
    escalation_sent BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_slas_case_id ON maestro.case_slas(case_id);
CREATE INDEX IF NOT EXISTS idx_case_slas_status ON maestro.case_slas(status);
CREATE INDEX IF NOT EXISTS idx_case_slas_due_at ON maestro.case_slas(due_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_case_slas_type ON maestro.case_slas(sla_type);

-- ======================
-- 8. CASE APPROVALS
-- ======================

CREATE TABLE IF NOT EXISTS maestro.case_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES maestro.cases(id) ON DELETE CASCADE,
    task_id UUID REFERENCES maestro.case_tasks(id) ON DELETE CASCADE,
    approval_type VARCHAR(50) NOT NULL CHECK (approval_type IN ('4-eyes', 'n-eyes', 'role-based', 'authority-based')),
    required_approvers INTEGER NOT NULL DEFAULT 2, -- For n-eyes
    required_role_id UUID REFERENCES maestro.case_roles(id),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    requested_by VARCHAR(255) NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    reason TEXT NOT NULL, -- Why approval is needed
    decision_reason TEXT, -- Why approved/rejected
    metadata JSONB DEFAULT '{}',

    CHECK (
        (approval_type = 'n-eyes' AND required_approvers >= 2) OR
        (approval_type = '4-eyes' AND required_approvers = 2) OR
        (approval_type IN ('role-based', 'authority-based') AND required_role_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_case_approvals_case_id ON maestro.case_approvals(case_id);
CREATE INDEX IF NOT EXISTS idx_case_approvals_task_id ON maestro.case_approvals(task_id);
CREATE INDEX IF NOT EXISTS idx_case_approvals_status ON maestro.case_approvals(status);

-- ======================
-- 9. CASE APPROVAL VOTES
-- ======================

CREATE TABLE IF NOT EXISTS maestro.case_approval_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_id UUID NOT NULL REFERENCES maestro.case_approvals(id) ON DELETE CASCADE,
    approver_user_id VARCHAR(255) NOT NULL,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('approve', 'reject', 'abstain')),
    reason TEXT,
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',

    UNIQUE(approval_id, approver_user_id)
);

CREATE INDEX IF NOT EXISTS idx_case_approval_votes_approval_id ON maestro.case_approval_votes(approval_id);
CREATE INDEX IF NOT EXISTS idx_case_approval_votes_approver ON maestro.case_approval_votes(approver_user_id);

-- ======================
-- 10. CASE GRAPH REFERENCES
-- ======================

CREATE TABLE IF NOT EXISTS maestro.case_graph_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES maestro.cases(id) ON DELETE CASCADE,
    graph_entity_id VARCHAR(255) NOT NULL, -- Opaque ID, no FK to graph DB
    entity_type VARCHAR(100), -- e.g., 'person', 'organization', 'location', 'event'
    entity_label VARCHAR(500), -- Human-readable label for UI display
    relationship_type VARCHAR(100), -- e.g., 'subject', 'witness', 'related_to'
    added_by VARCHAR(255) NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    removed_at TIMESTAMP WITH TIME ZONE,
    removed_by VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',

    UNIQUE(case_id, graph_entity_id) WHERE is_active = true
);

CREATE INDEX IF NOT EXISTS idx_case_graph_refs_case_id ON maestro.case_graph_references(case_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_case_graph_refs_entity_id ON maestro.case_graph_references(graph_entity_id);
CREATE INDEX IF NOT EXISTS idx_case_graph_refs_type ON maestro.case_graph_references(entity_type);

-- ======================
-- 11. TRIGGERS
-- ======================

-- Trigger to update updated_at on case_tasks
CREATE TRIGGER update_case_tasks_updated_at
    BEFORE UPDATE ON maestro.case_tasks
    FOR EACH ROW
    EXECUTE FUNCTION maestro.update_updated_at_column();

-- Trigger to update updated_at on case_slas
CREATE TRIGGER update_case_slas_updated_at
    BEFORE UPDATE ON maestro.case_slas
    FOR EACH ROW
    EXECUTE FUNCTION maestro.update_updated_at_column();

-- Trigger to update updated_at on case_roles
CREATE TRIGGER update_case_roles_updated_at
    BEFORE UPDATE ON maestro.case_roles
    FOR EACH ROW
    EXECUTE FUNCTION maestro.update_updated_at_column();

-- Trigger to log state transitions
CREATE OR REPLACE FUNCTION maestro.log_case_state_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Log stage transitions
    IF (OLD.current_stage IS DISTINCT FROM NEW.current_stage) THEN
        INSERT INTO maestro.case_state_history (
            case_id, from_stage, to_stage, from_status, to_status,
            transitioned_by, reason, metadata
        ) VALUES (
            NEW.id, OLD.current_stage, NEW.current_stage,
            OLD.status, NEW.status,
            COALESCE(current_setting('app.current_user_id', true), 'system'),
            COALESCE(current_setting('app.transition_reason', true), 'Automated stage transition'),
            '{}'::jsonb
        );
    -- Log status transitions (without stage change)
    ELSIF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO maestro.case_state_history (
            case_id, from_stage, to_stage, from_status, to_status,
            transitioned_by, reason, metadata
        ) VALUES (
            NEW.id, NEW.current_stage, NEW.current_stage,
            OLD.status, NEW.status,
            COALESCE(current_setting('app.current_user_id', true), 'system'),
            COALESCE(current_setting('app.transition_reason', true), 'Status change'),
            '{}'::jsonb
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER case_state_transition_logger
    AFTER UPDATE ON maestro.cases
    FOR EACH ROW
    WHEN (OLD.current_stage IS DISTINCT FROM NEW.current_stage OR OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION maestro.log_case_state_transition();

-- Trigger to auto-update SLA status
CREATE OR REPLACE FUNCTION maestro.update_sla_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark as at_risk if due date is approaching
    IF NEW.status = 'active' AND NEW.due_at <= NOW() + (NEW.at_risk_threshold_hours || ' hours')::INTERVAL THEN
        NEW.status := 'at_risk';
    END IF;

    -- Mark as breached if past due
    IF NEW.status IN ('active', 'at_risk') AND NEW.due_at <= NOW() THEN
        NEW.status := 'breached';
        NEW.breached_at := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sla_status_updater
    BEFORE INSERT OR UPDATE ON maestro.case_slas
    FOR EACH ROW
    WHEN (NEW.status IN ('active', 'at_risk'))
    EXECUTE FUNCTION maestro.update_sla_status();

-- Trigger to auto-complete approvals when threshold met
CREATE OR REPLACE FUNCTION maestro.check_approval_completion()
RETURNS TRIGGER AS $$
DECLARE
    approval_row maestro.case_approvals%ROWTYPE;
    approve_count INTEGER;
    reject_count INTEGER;
BEGIN
    -- Get the approval record
    SELECT * INTO approval_row FROM maestro.case_approvals WHERE id = NEW.approval_id;

    -- Count votes
    SELECT
        COUNT(*) FILTER (WHERE decision = 'approve'),
        COUNT(*) FILTER (WHERE decision = 'reject')
    INTO approve_count, reject_count
    FROM maestro.case_approval_votes
    WHERE approval_id = NEW.approval_id;

    -- Check if approval threshold met
    IF approve_count >= approval_row.required_approvers THEN
        UPDATE maestro.case_approvals
        SET status = 'approved', completed_at = NOW()
        WHERE id = NEW.approval_id AND status = 'pending';
    -- Check if rejected
    ELSIF reject_count > 0 AND approval_row.approval_type IN ('4-eyes', 'n-eyes') THEN
        -- For n-eyes, one rejection may not fail the approval depending on requirements
        -- For now, simplified: any rejection fails 4-eyes
        IF approval_row.approval_type = '4-eyes' THEN
            UPDATE maestro.case_approvals
            SET status = 'rejected', completed_at = NOW(),
                decision_reason = 'Rejected by approver'
            WHERE id = NEW.approval_id AND status = 'pending';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER approval_completion_checker
    AFTER INSERT ON maestro.case_approval_votes
    FOR EACH ROW
    EXECUTE FUNCTION maestro.check_approval_completion();

-- ======================
-- 12. HELPER FUNCTIONS
-- ======================

-- Function to check if stage transition is allowed
CREATE OR REPLACE FUNCTION maestro.is_stage_transition_allowed(
    p_case_type VARCHAR(100),
    p_from_stage VARCHAR(100),
    p_to_stage VARCHAR(100)
)
RETURNS BOOLEAN AS $$
DECLARE
    allowed_transitions TEXT[];
BEGIN
    -- Get allowed transitions for the from_stage
    SELECT cs.allowed_transitions INTO allowed_transitions
    FROM maestro.case_stages cs
    WHERE cs.case_type = p_case_type AND cs.name = p_from_stage;

    -- If from_stage not found or no transitions defined, disallow
    IF allowed_transitions IS NULL THEN
        RETURN false;
    END IF;

    -- Check if to_stage is in allowed list
    RETURN p_to_stage = ANY(allowed_transitions);
END;
$$ LANGUAGE plpgsql;

-- Function to get overdue tasks for a case
CREATE OR REPLACE FUNCTION maestro.get_overdue_tasks(p_case_id UUID)
RETURNS TABLE (
    task_id UUID,
    title VARCHAR(500),
    assigned_to VARCHAR(255),
    due_date TIMESTAMP WITH TIME ZONE,
    days_overdue NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.title,
        t.assigned_to,
        t.due_date,
        EXTRACT(DAY FROM NOW() - t.due_date) as days_overdue
    FROM maestro.case_tasks t
    WHERE t.case_id = p_case_id
    AND t.status NOT IN ('completed', 'cancelled')
    AND t.due_date < NOW()
    ORDER BY t.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get case SLA summary
CREATE OR REPLACE FUNCTION maestro.get_case_sla_summary(p_case_id UUID)
RETURNS TABLE (
    total_slas INTEGER,
    active_slas INTEGER,
    met_slas INTEGER,
    breached_slas INTEGER,
    at_risk_slas INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_slas,
        COUNT(*) FILTER (WHERE status = 'active')::INTEGER as active_slas,
        COUNT(*) FILTER (WHERE status = 'met')::INTEGER as met_slas,
        COUNT(*) FILTER (WHERE status = 'breached')::INTEGER as breached_slas,
        COUNT(*) FILTER (WHERE status = 'at_risk')::INTEGER as at_risk_slas
    FROM maestro.case_slas
    WHERE case_id = p_case_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending approvals for a user
CREATE OR REPLACE FUNCTION maestro.get_pending_approvals_for_user(p_user_id VARCHAR(255))
RETURNS TABLE (
    approval_id UUID,
    case_id UUID,
    case_title VARCHAR(500),
    approval_type VARCHAR(50),
    reason TEXT,
    requested_at TIMESTAMP WITH TIME ZONE,
    required_approvers INTEGER,
    current_approvals INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.case_id,
        c.title,
        a.approval_type,
        a.reason,
        a.requested_at,
        a.required_approvers,
        (SELECT COUNT(*) FROM maestro.case_approval_votes v
         WHERE v.approval_id = a.id AND v.decision = 'approve')::INTEGER
    FROM maestro.case_approvals a
    JOIN maestro.cases c ON c.id = a.case_id
    LEFT JOIN maestro.case_approval_votes v ON v.approval_id = a.id AND v.approver_user_id = p_user_id
    WHERE a.status = 'pending'
    AND v.id IS NULL -- User hasn't voted yet
    ORDER BY a.requested_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ======================
-- 13. VIEWS
-- ======================

-- View: Active cases with participant count and SLA status
CREATE OR REPLACE VIEW maestro.v_active_cases_summary AS
SELECT
    c.id,
    c.tenant_id,
    c.title,
    c.status,
    c.priority,
    c.current_stage,
    c.case_type,
    c.due_date,
    c.created_at,
    COUNT(DISTINCT p.user_id) as participant_count,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status NOT IN ('completed', 'cancelled')) as open_task_count,
    COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'breached') as breached_sla_count,
    COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'at_risk') as at_risk_sla_count,
    COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'pending') as pending_approval_count
FROM maestro.cases c
LEFT JOIN maestro.case_participants p ON p.case_id = c.id AND p.is_active = true
LEFT JOIN maestro.case_tasks t ON t.case_id = c.id
LEFT JOIN maestro.case_slas s ON s.case_id = c.id
LEFT JOIN maestro.case_approvals a ON a.case_id = c.id
WHERE c.status NOT IN ('closed', 'archived')
GROUP BY c.id, c.tenant_id, c.title, c.status, c.priority, c.current_stage,
         c.case_type, c.due_date, c.created_at;

-- View: User workload (tasks assigned to users)
CREATE OR REPLACE VIEW maestro.v_user_workload AS
SELECT
    t.assigned_to as user_id,
    c.tenant_id,
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE t.status = 'in_progress') as in_progress_tasks,
    COUNT(*) FILTER (WHERE t.status = 'pending') as pending_tasks,
    COUNT(*) FILTER (WHERE t.due_date < NOW() AND t.status NOT IN ('completed', 'cancelled')) as overdue_tasks,
    COUNT(DISTINCT t.case_id) as active_case_count
FROM maestro.case_tasks t
JOIN maestro.cases c ON c.id = t.case_id
WHERE t.status NOT IN ('completed', 'cancelled')
AND t.assigned_to IS NOT NULL
GROUP BY t.assigned_to, c.tenant_id;

-- Comments for documentation
COMMENT ON TABLE maestro.case_roles IS 'Roles that can be assigned to case participants (investigator, analyst, approver, etc.)';
COMMENT ON TABLE maestro.case_participants IS 'Users assigned to cases with their roles';
COMMENT ON TABLE maestro.case_stages IS 'Workflow stages for different case types with allowed transitions';
COMMENT ON TABLE maestro.case_state_history IS 'Immutable audit trail of all case stage and status transitions';
COMMENT ON TABLE maestro.case_tasks IS 'Tasks within cases, can be assigned to users and tracked';
COMMENT ON TABLE maestro.case_slas IS 'Service Level Agreement tracking for cases, stages, and tasks';
COMMENT ON TABLE maestro.case_approvals IS 'Approval requests for 4-eyes, n-eyes, and role-based approvals';
COMMENT ON TABLE maestro.case_approval_votes IS 'Individual approval votes from approvers';
COMMENT ON TABLE maestro.case_graph_references IS 'References to graph entities (stored as opaque IDs, no FK to graph DB)';
