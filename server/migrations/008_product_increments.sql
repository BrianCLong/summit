-- Product Increments Schema
-- Tracks sprint/iteration progress, goals, milestones, and deliverables
-- for the IntelGraph intelligence analysis platform

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- PRODUCT INCREMENTS TABLE
-- Core table for tracking product increments (sprints/iterations)
-- =============================================================================
CREATE TABLE IF NOT EXISTS product_increments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,

  -- Core increment metadata
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL,  -- Semantic version (e.g., '1.2.0', 'Sprint-42')

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN (
    'planning',      -- Increment is being planned
    'active',        -- Currently in progress
    'review',        -- In review/QA phase
    'completed',     -- Successfully completed
    'released',      -- Released to production
    'cancelled'      -- Cancelled/abandoned
  )),

  -- Timeline
  planned_start_date TIMESTAMPTZ,
  planned_end_date TIMESTAMPTZ,
  actual_start_date TIMESTAMPTZ,
  actual_end_date TIMESTAMPTZ,

  -- Capacity and velocity tracking
  planned_capacity_points INT DEFAULT 0,
  committed_points INT DEFAULT 0,
  completed_points INT DEFAULT 0,
  velocity NUMERIC(5,2),  -- Calculated velocity for this increment

  -- Release information
  release_notes TEXT,
  release_tag TEXT,  -- Git tag or release identifier
  release_url TEXT,  -- Link to release artifacts

  -- Flexible properties for custom metadata
  props JSONB NOT NULL DEFAULT '{}',

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL,
  updated_by TEXT
);

-- Performance indexes for product_increments
CREATE INDEX IF NOT EXISTS idx_increments_tenant ON product_increments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_increments_status ON product_increments (status);
CREATE INDEX IF NOT EXISTS idx_increments_version ON product_increments (tenant_id, version);
CREATE INDEX IF NOT EXISTS idx_increments_dates ON product_increments (planned_start_date, planned_end_date);
CREATE INDEX IF NOT EXISTS idx_increments_created_at ON product_increments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_increments_props ON product_increments USING GIN (props);

-- =============================================================================
-- INCREMENT GOALS TABLE
-- Goals and objectives associated with each product increment
-- =============================================================================
CREATE TABLE IF NOT EXISTS increment_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  increment_id UUID NOT NULL REFERENCES product_increments(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,

  -- Goal details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'feature' CHECK (category IN (
    'feature',       -- New feature development
    'enhancement',   -- Improvement to existing feature
    'bugfix',        -- Bug fix
    'technical',     -- Technical debt / refactoring
    'security',      -- Security improvement
    'performance',   -- Performance optimization
    'compliance',    -- Regulatory/compliance requirement
    'research'       -- Research/exploration
  )),

  -- Priority and effort
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN (
    'critical', 'high', 'medium', 'low'
  )),
  story_points INT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',       -- Not yet started
    'in_progress',   -- Currently being worked on
    'blocked',       -- Blocked by dependency/issue
    'completed',     -- Successfully completed
    'deferred',      -- Moved to future increment
    'cancelled'      -- Cancelled
  )),

  -- Success criteria
  acceptance_criteria JSONB DEFAULT '[]',  -- Array of criteria
  success_metrics JSONB DEFAULT '{}',      -- Key metrics and targets

  -- Completion tracking
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,

  -- Flexible properties
  props JSONB NOT NULL DEFAULT '{}',

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL
);

-- Performance indexes for increment_goals
CREATE INDEX IF NOT EXISTS idx_goals_increment ON increment_goals (increment_id);
CREATE INDEX IF NOT EXISTS idx_goals_tenant ON increment_goals (tenant_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON increment_goals (status);
CREATE INDEX IF NOT EXISTS idx_goals_priority ON increment_goals (priority);
CREATE INDEX IF NOT EXISTS idx_goals_category ON increment_goals (category);

-- =============================================================================
-- INCREMENT DELIVERABLES TABLE
-- Concrete deliverables/work items within each increment
-- =============================================================================
CREATE TABLE IF NOT EXISTS increment_deliverables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  increment_id UUID NOT NULL REFERENCES product_increments(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES increment_goals(id) ON DELETE SET NULL,
  tenant_id TEXT NOT NULL,

  -- Deliverable details
  title TEXT NOT NULL,
  description TEXT,
  deliverable_type TEXT NOT NULL DEFAULT 'task' CHECK (deliverable_type IN (
    'epic',          -- Large body of work
    'story',         -- User story
    'task',          -- Individual task
    'bug',           -- Bug fix
    'spike',         -- Research/investigation
    'subtask'        -- Sub-item of another deliverable
  )),

  -- Hierarchy support
  parent_id UUID REFERENCES increment_deliverables(id) ON DELETE CASCADE,

  -- Prioritization
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN (
    'critical', 'high', 'medium', 'low'
  )),
  story_points INT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN (
    'backlog',       -- In backlog
    'ready',         -- Ready for development
    'in_progress',   -- In progress
    'in_review',     -- In code review
    'testing',       -- In QA/testing
    'done',          -- Completed
    'blocked',       -- Blocked
    'cancelled'      -- Cancelled
  )),

  -- Assignment
  assignee_id TEXT,
  assignee_name TEXT,

  -- External references
  external_id TEXT,       -- Jira, GitHub issue, etc.
  external_url TEXT,

  -- Progress tracking
  progress_percent INT DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Investigation linkage (connects to IntelGraph investigations)
  investigation_id UUID,

  -- Flexible properties
  props JSONB NOT NULL DEFAULT '{}',

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL
);

-- Performance indexes for increment_deliverables
CREATE INDEX IF NOT EXISTS idx_deliverables_increment ON increment_deliverables (increment_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_goal ON increment_deliverables (goal_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_tenant ON increment_deliverables (tenant_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON increment_deliverables (status);
CREATE INDEX IF NOT EXISTS idx_deliverables_type ON increment_deliverables (deliverable_type);
CREATE INDEX IF NOT EXISTS idx_deliverables_assignee ON increment_deliverables (assignee_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_parent ON increment_deliverables (parent_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_investigation ON increment_deliverables (investigation_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_external ON increment_deliverables (external_id);

-- =============================================================================
-- INCREMENT TEAM ASSIGNMENTS TABLE
-- Team members assigned to each increment
-- =============================================================================
CREATE TABLE IF NOT EXISTS increment_team_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  increment_id UUID NOT NULL REFERENCES product_increments(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,

  -- Team member info
  user_id TEXT NOT NULL,
  user_name TEXT,
  user_email TEXT,

  -- Role in this increment
  role TEXT NOT NULL DEFAULT 'contributor' CHECK (role IN (
    'owner',         -- Increment owner/lead
    'contributor',   -- Team contributor
    'reviewer',      -- Code/work reviewer
    'stakeholder',   -- Interested party
    'observer'       -- Read-only access
  )),

  -- Capacity allocation (percentage of time)
  allocation_percent INT DEFAULT 100 CHECK (allocation_percent BETWEEN 0 AND 100),

  -- Flexible properties
  props JSONB NOT NULL DEFAULT '{}',

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one assignment per user per increment
  UNIQUE (increment_id, user_id)
);

-- Performance indexes for team assignments
CREATE INDEX IF NOT EXISTS idx_team_increment ON increment_team_assignments (increment_id);
CREATE INDEX IF NOT EXISTS idx_team_user ON increment_team_assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_team_role ON increment_team_assignments (role);

-- =============================================================================
-- INCREMENT METRICS SNAPSHOTS TABLE
-- Historical metrics for tracking progress over time
-- =============================================================================
CREATE TABLE IF NOT EXISTS increment_metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  increment_id UUID NOT NULL REFERENCES product_increments(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,

  -- Snapshot timestamp
  snapshot_date DATE NOT NULL,

  -- Burndown/burnup metrics
  total_points INT DEFAULT 0,
  completed_points INT DEFAULT 0,
  remaining_points INT DEFAULT 0,

  -- Item counts
  total_items INT DEFAULT 0,
  completed_items INT DEFAULT 0,
  in_progress_items INT DEFAULT 0,
  blocked_items INT DEFAULT 0,

  -- Goal progress
  goals_total INT DEFAULT 0,
  goals_completed INT DEFAULT 0,

  -- Additional metrics as flexible JSON
  metrics JSONB NOT NULL DEFAULT '{}',

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One snapshot per increment per day
  UNIQUE (increment_id, snapshot_date)
);

-- Performance indexes for metrics snapshots
CREATE INDEX IF NOT EXISTS idx_metrics_increment ON increment_metrics_snapshots (increment_id);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON increment_metrics_snapshots (snapshot_date DESC);

-- =============================================================================
-- INCREMENT CHANGELOG TABLE
-- Tracks all changes to increments for audit purposes
-- =============================================================================
CREATE TABLE IF NOT EXISTS increment_changelog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  increment_id UUID NOT NULL REFERENCES product_increments(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,

  -- Change details
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'increment', 'goal', 'deliverable', 'assignment'
  )),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'created', 'updated', 'deleted', 'status_changed', 'assigned', 'unassigned'
  )),

  -- Change data
  previous_values JSONB,
  new_values JSONB,
  change_summary TEXT,

  -- Actor
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes for changelog
CREATE INDEX IF NOT EXISTS idx_changelog_increment ON increment_changelog (increment_id);
CREATE INDEX IF NOT EXISTS idx_changelog_entity ON increment_changelog (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_changelog_date ON increment_changelog (changed_at DESC);

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- View: Current increment summary with computed metrics
CREATE OR REPLACE VIEW v_increment_summary AS
SELECT
  pi.id,
  pi.tenant_id,
  pi.name,
  pi.version,
  pi.status,
  pi.planned_start_date,
  pi.planned_end_date,
  pi.actual_start_date,
  pi.actual_end_date,
  pi.planned_capacity_points,
  pi.committed_points,
  pi.completed_points,
  COALESCE(goal_counts.total_goals, 0) as total_goals,
  COALESCE(goal_counts.completed_goals, 0) as completed_goals,
  COALESCE(deliverable_counts.total_deliverables, 0) as total_deliverables,
  COALESCE(deliverable_counts.completed_deliverables, 0) as completed_deliverables,
  COALESCE(deliverable_counts.in_progress_deliverables, 0) as in_progress_deliverables,
  COALESCE(deliverable_counts.blocked_deliverables, 0) as blocked_deliverables,
  COALESCE(team_counts.team_size, 0) as team_size,
  pi.created_at,
  pi.updated_at
FROM product_increments pi
LEFT JOIN (
  SELECT
    increment_id,
    COUNT(*) as total_goals,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_goals
  FROM increment_goals
  GROUP BY increment_id
) goal_counts ON goal_counts.increment_id = pi.id
LEFT JOIN (
  SELECT
    increment_id,
    COUNT(*) as total_deliverables,
    COUNT(*) FILTER (WHERE status = 'done') as completed_deliverables,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_deliverables,
    COUNT(*) FILTER (WHERE status = 'blocked') as blocked_deliverables
  FROM increment_deliverables
  GROUP BY increment_id
) deliverable_counts ON deliverable_counts.increment_id = pi.id
LEFT JOIN (
  SELECT
    increment_id,
    COUNT(*) as team_size
  FROM increment_team_assignments
  GROUP BY increment_id
) team_counts ON team_counts.increment_id = pi.id;

-- =============================================================================
-- FUNCTIONS FOR AUTOMATION
-- =============================================================================

-- Function: Automatically update increment points on deliverable changes
CREATE OR REPLACE FUNCTION update_increment_points()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE product_increments SET
      committed_points = COALESCE((
        SELECT SUM(COALESCE(story_points, 0))
        FROM increment_deliverables
        WHERE increment_id = OLD.increment_id
      ), 0),
      completed_points = COALESCE((
        SELECT SUM(COALESCE(story_points, 0))
        FROM increment_deliverables
        WHERE increment_id = OLD.increment_id AND status = 'done'
      ), 0),
      updated_at = now()
    WHERE id = OLD.increment_id;
    RETURN OLD;
  ELSE
    UPDATE product_increments SET
      committed_points = COALESCE((
        SELECT SUM(COALESCE(story_points, 0))
        FROM increment_deliverables
        WHERE increment_id = NEW.increment_id
      ), 0),
      completed_points = COALESCE((
        SELECT SUM(COALESCE(story_points, 0))
        FROM increment_deliverables
        WHERE increment_id = NEW.increment_id AND status = 'done'
      ), 0),
      updated_at = now()
    WHERE id = NEW.increment_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update increment points when deliverables change
DROP TRIGGER IF EXISTS trg_update_increment_points ON increment_deliverables;
CREATE TRIGGER trg_update_increment_points
AFTER INSERT OR UPDATE OF story_points, status OR DELETE
ON increment_deliverables
FOR EACH ROW
EXECUTE FUNCTION update_increment_points();

-- Function: Calculate and store velocity when increment is completed
CREATE OR REPLACE FUNCTION calculate_increment_velocity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Calculate velocity based on completed points and duration
    IF NEW.actual_start_date IS NOT NULL AND NEW.actual_end_date IS NOT NULL THEN
      NEW.velocity := NEW.completed_points::NUMERIC /
        GREATEST(1, EXTRACT(EPOCH FROM (NEW.actual_end_date - NEW.actual_start_date)) / 86400 / 7);
    END IF;
    NEW.actual_end_date := COALESCE(NEW.actual_end_date, now());
  END IF;

  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    NEW.actual_start_date := COALESCE(NEW.actual_start_date, now());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-calculate velocity on status change
DROP TRIGGER IF EXISTS trg_calculate_velocity ON product_increments;
CREATE TRIGGER trg_calculate_velocity
BEFORE UPDATE OF status
ON product_increments
FOR EACH ROW
EXECUTE FUNCTION calculate_increment_velocity();

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================
COMMENT ON TABLE product_increments IS 'Tracks product increments (sprints/iterations) for agile project management';
COMMENT ON TABLE increment_goals IS 'Goals and objectives for each product increment';
COMMENT ON TABLE increment_deliverables IS 'Work items and deliverables within each increment';
COMMENT ON TABLE increment_team_assignments IS 'Team member assignments to increments';
COMMENT ON TABLE increment_metrics_snapshots IS 'Historical metrics snapshots for burndown charts';
COMMENT ON TABLE increment_changelog IS 'Audit log of all changes to increment-related entities';
