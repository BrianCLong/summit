/**
 * Migration: Strategic Planning Module
 *
 * Creates tables for strategic planning workflow:
 * - strategic_plans: Top-level planning entities
 * - strategic_objectives: Measurable goals within plans
 * - strategic_initiatives: Actions to achieve objectives
 * - strategic_milestones: Key checkpoints
 * - strategic_risks: Risk assessments
 * - strategic_stakeholders: Involved parties
 * - strategic_resources: Resource allocations
 * - strategic_kpis: Performance indicators
 */

import { Pool } from 'pg';

export default async function migrate(pool?: Pool) {
  const pg = pool || new Pool({ connectionString: process.env.DATABASE_URL });

  await pg.query(`
    -- ========================================================================
    -- ENUM TYPES
    -- ========================================================================

    -- Plan status enum
    DO $$ BEGIN
      CREATE TYPE strategic_plan_status AS ENUM (
        'DRAFT', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE',
        'ON_HOLD', 'COMPLETED', 'ARCHIVED', 'CANCELLED'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Priority enum
    DO $$ BEGIN
      CREATE TYPE strategic_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Time horizon enum
    DO $$ BEGIN
      CREATE TYPE strategic_time_horizon AS ENUM (
        'SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM', 'STRATEGIC'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Objective status enum
    DO $$ BEGIN
      CREATE TYPE strategic_objective_status AS ENUM (
        'NOT_STARTED', 'IN_PROGRESS', 'AT_RISK', 'ON_TRACK',
        'COMPLETED', 'BLOCKED', 'DEFERRED'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Initiative type enum
    DO $$ BEGIN
      CREATE TYPE strategic_initiative_type AS ENUM (
        'COLLECTION', 'ANALYSIS', 'DISSEMINATION', 'COORDINATION',
        'CAPABILITY_BUILDING', 'TECHNOLOGY', 'PARTNERSHIP', 'TRAINING'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Risk level enum
    DO $$ BEGIN
      CREATE TYPE strategic_risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Risk category enum
    DO $$ BEGIN
      CREATE TYPE strategic_risk_category AS ENUM (
        'OPERATIONAL', 'STRATEGIC', 'RESOURCE', 'SECURITY',
        'COMPLIANCE', 'TECHNICAL', 'EXTERNAL'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Risk status enum
    DO $$ BEGIN
      CREATE TYPE strategic_risk_status AS ENUM (
        'IDENTIFIED', 'ASSESSED', 'MITIGATING', 'MITIGATED', 'ACCEPTED', 'CLOSED'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Milestone status enum
    DO $$ BEGIN
      CREATE TYPE strategic_milestone_status AS ENUM (
        'PENDING', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'DEFERRED'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Resource type enum
    DO $$ BEGIN
      CREATE TYPE strategic_resource_type AS ENUM (
        'PERSONNEL', 'BUDGET', 'TECHNOLOGY', 'INTELLIGENCE', 'PARTNERSHIP'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Resource status enum
    DO $$ BEGIN
      CREATE TYPE strategic_resource_status AS ENUM (
        'PLANNED', 'ALLOCATED', 'IN_USE', 'RELEASED'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Stakeholder role enum
    DO $$ BEGIN
      CREATE TYPE strategic_stakeholder_role AS ENUM (
        'OWNER', 'SPONSOR', 'CONTRIBUTOR', 'REVIEWER', 'OBSERVER'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- KPI frequency enum
    DO $$ BEGIN
      CREATE TYPE strategic_kpi_frequency AS ENUM (
        'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Trend enum
    DO $$ BEGIN
      CREATE TYPE strategic_trend AS ENUM ('UP', 'DOWN', 'STABLE');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- ========================================================================
    -- MAIN TABLES
    -- ========================================================================

    -- Strategic Plans
    CREATE TABLE IF NOT EXISTS strategic_plans (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id text NOT NULL,
      investigation_id uuid,
      name text NOT NULL,
      description text NOT NULL,
      status strategic_plan_status NOT NULL DEFAULT 'DRAFT',
      priority strategic_priority NOT NULL DEFAULT 'MEDIUM',
      time_horizon strategic_time_horizon NOT NULL DEFAULT 'MEDIUM_TERM',
      start_date timestamptz NOT NULL,
      end_date timestamptz NOT NULL,
      assumptions text[] DEFAULT '{}',
      constraints text[] DEFAULT '{}',
      dependencies text[] DEFAULT '{}',
      tags text[] DEFAULT '{}',
      metadata jsonb DEFAULT '{}',
      created_by text NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      approved_by text,
      approved_at timestamptz,
      version integer DEFAULT 1,
      CONSTRAINT valid_date_range CHECK (end_date > start_date)
    );

    -- Strategic Objectives
    CREATE TABLE IF NOT EXISTS strategic_objectives (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_id uuid NOT NULL REFERENCES strategic_plans(id) ON DELETE CASCADE,
      name text NOT NULL,
      description text NOT NULL,
      status strategic_objective_status NOT NULL DEFAULT 'NOT_STARTED',
      priority strategic_priority NOT NULL DEFAULT 'MEDIUM',
      target_value numeric NOT NULL,
      current_value numeric DEFAULT 0,
      unit text NOT NULL,
      start_date timestamptz NOT NULL,
      target_date timestamptz NOT NULL,
      aligned_intelligence_priorities text[] DEFAULT '{}',
      success_criteria text[] DEFAULT '{}',
      dependencies text[] DEFAULT '{}',
      created_by text NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Key Results (for OKR-style tracking)
    CREATE TABLE IF NOT EXISTS strategic_key_results (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      objective_id uuid NOT NULL REFERENCES strategic_objectives(id) ON DELETE CASCADE,
      description text NOT NULL,
      target_value numeric NOT NULL,
      current_value numeric DEFAULT 0,
      unit text NOT NULL,
      weight numeric DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
      status strategic_objective_status NOT NULL DEFAULT 'NOT_STARTED',
      due_date timestamptz NOT NULL,
      updated_at timestamptz DEFAULT now()
    );

    -- Strategic Initiatives
    CREATE TABLE IF NOT EXISTS strategic_initiatives (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_id uuid NOT NULL REFERENCES strategic_plans(id) ON DELETE CASCADE,
      objective_ids uuid[] DEFAULT '{}',
      name text NOT NULL,
      description text NOT NULL,
      type strategic_initiative_type NOT NULL,
      status strategic_objective_status NOT NULL DEFAULT 'NOT_STARTED',
      priority strategic_priority NOT NULL DEFAULT 'MEDIUM',
      start_date timestamptz NOT NULL,
      end_date timestamptz NOT NULL,
      budget numeric,
      budget_used numeric DEFAULT 0,
      assigned_to text[] DEFAULT '{}',
      risks text[] DEFAULT '{}',
      dependencies text[] DEFAULT '{}',
      created_by text NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Deliverables
    CREATE TABLE IF NOT EXISTS strategic_deliverables (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      initiative_id uuid NOT NULL REFERENCES strategic_initiatives(id) ON DELETE CASCADE,
      name text NOT NULL,
      description text NOT NULL,
      type text NOT NULL,
      status strategic_milestone_status NOT NULL DEFAULT 'PENDING',
      due_date timestamptz NOT NULL,
      completed_at timestamptz,
      artifacts text[] DEFAULT '{}'
    );

    -- Strategic Milestones
    CREATE TABLE IF NOT EXISTS strategic_milestones (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      parent_id uuid NOT NULL,
      parent_type text NOT NULL CHECK (parent_type IN ('objective', 'initiative')),
      name text NOT NULL,
      description text NOT NULL,
      status strategic_milestone_status NOT NULL DEFAULT 'PENDING',
      due_date timestamptz NOT NULL,
      completed_at timestamptz,
      completed_by text,
      deliverables text[] DEFAULT '{}',
      dependencies text[] DEFAULT '{}'
    );

    -- Strategic Risks
    CREATE TABLE IF NOT EXISTS strategic_risks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_id uuid NOT NULL REFERENCES strategic_plans(id) ON DELETE CASCADE,
      name text NOT NULL,
      description text NOT NULL,
      category strategic_risk_category NOT NULL,
      likelihood integer NOT NULL CHECK (likelihood >= 1 AND likelihood <= 5),
      impact integer NOT NULL CHECK (impact >= 1 AND impact <= 5),
      risk_score integer GENERATED ALWAYS AS (likelihood * impact) STORED,
      risk_level strategic_risk_level NOT NULL,
      status strategic_risk_status NOT NULL DEFAULT 'IDENTIFIED',
      contingency_plans text[] DEFAULT '{}',
      owner text NOT NULL,
      identified_at timestamptz DEFAULT now(),
      last_assessed_at timestamptz DEFAULT now(),
      review_date timestamptz NOT NULL
    );

    -- Mitigation Strategies
    CREATE TABLE IF NOT EXISTS strategic_mitigations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      risk_id uuid NOT NULL REFERENCES strategic_risks(id) ON DELETE CASCADE,
      description text NOT NULL,
      type text NOT NULL CHECK (type IN ('AVOID', 'MITIGATE', 'TRANSFER', 'ACCEPT')),
      status text NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED')),
      effectiveness numeric DEFAULT 0 CHECK (effectiveness >= 0 AND effectiveness <= 100),
      cost numeric,
      owner text NOT NULL,
      deadline timestamptz NOT NULL
    );

    -- Strategic Stakeholders
    CREATE TABLE IF NOT EXISTS strategic_stakeholders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_id uuid NOT NULL REFERENCES strategic_plans(id) ON DELETE CASCADE,
      user_id text NOT NULL,
      name text NOT NULL,
      role strategic_stakeholder_role NOT NULL,
      responsibilities text[] DEFAULT '{}',
      communication_preferences jsonb DEFAULT '{"frequency": "WEEKLY", "channels": ["email"]}',
      added_at timestamptz DEFAULT now(),
      added_by text NOT NULL,
      UNIQUE (plan_id, user_id)
    );

    -- Strategic Resources
    CREATE TABLE IF NOT EXISTS strategic_resources (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_id uuid NOT NULL REFERENCES strategic_plans(id) ON DELETE CASCADE,
      type strategic_resource_type NOT NULL,
      name text NOT NULL,
      description text NOT NULL,
      allocated numeric NOT NULL,
      used numeric DEFAULT 0,
      unit text NOT NULL,
      start_date timestamptz NOT NULL,
      end_date timestamptz NOT NULL,
      status strategic_resource_status NOT NULL DEFAULT 'PLANNED'
    );

    -- Strategic KPIs
    CREATE TABLE IF NOT EXISTS strategic_kpis (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_id uuid NOT NULL REFERENCES strategic_plans(id) ON DELETE CASCADE,
      name text NOT NULL,
      description text NOT NULL,
      formula text NOT NULL,
      target_value numeric NOT NULL,
      current_value numeric DEFAULT 0,
      unit text NOT NULL,
      frequency strategic_kpi_frequency NOT NULL DEFAULT 'MONTHLY',
      trend strategic_trend DEFAULT 'STABLE',
      last_updated timestamptz DEFAULT now(),
      history jsonb DEFAULT '[]'
    );

    -- Plan Activity Log (for audit trail)
    CREATE TABLE IF NOT EXISTS strategic_plan_activities (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_id uuid NOT NULL REFERENCES strategic_plans(id) ON DELETE CASCADE,
      entity_type text NOT NULL,
      entity_id uuid NOT NULL,
      action text NOT NULL,
      actor_id text NOT NULL,
      changes jsonb DEFAULT '{}',
      created_at timestamptz DEFAULT now()
    );

    -- ========================================================================
    -- INDEXES
    -- ========================================================================

    -- Plans indexes
    CREATE INDEX IF NOT EXISTS idx_strategic_plans_tenant ON strategic_plans(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_strategic_plans_status ON strategic_plans(status);
    CREATE INDEX IF NOT EXISTS idx_strategic_plans_priority ON strategic_plans(priority);
    CREATE INDEX IF NOT EXISTS idx_strategic_plans_time_horizon ON strategic_plans(time_horizon);
    CREATE INDEX IF NOT EXISTS idx_strategic_plans_investigation ON strategic_plans(investigation_id);
    CREATE INDEX IF NOT EXISTS idx_strategic_plans_created ON strategic_plans(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_strategic_plans_dates ON strategic_plans(start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_strategic_plans_tags ON strategic_plans USING gin(tags);

    -- Objectives indexes
    CREATE INDEX IF NOT EXISTS idx_strategic_objectives_plan ON strategic_objectives(plan_id);
    CREATE INDEX IF NOT EXISTS idx_strategic_objectives_status ON strategic_objectives(status);
    CREATE INDEX IF NOT EXISTS idx_strategic_objectives_target_date ON strategic_objectives(target_date);

    -- Key Results indexes
    CREATE INDEX IF NOT EXISTS idx_strategic_key_results_objective ON strategic_key_results(objective_id);
    CREATE INDEX IF NOT EXISTS idx_strategic_key_results_due ON strategic_key_results(due_date);

    -- Initiatives indexes
    CREATE INDEX IF NOT EXISTS idx_strategic_initiatives_plan ON strategic_initiatives(plan_id);
    CREATE INDEX IF NOT EXISTS idx_strategic_initiatives_status ON strategic_initiatives(status);
    CREATE INDEX IF NOT EXISTS idx_strategic_initiatives_type ON strategic_initiatives(type);
    CREATE INDEX IF NOT EXISTS idx_strategic_initiatives_dates ON strategic_initiatives(start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_strategic_initiatives_objectives ON strategic_initiatives USING gin(objective_ids);

    -- Deliverables indexes
    CREATE INDEX IF NOT EXISTS idx_strategic_deliverables_initiative ON strategic_deliverables(initiative_id);
    CREATE INDEX IF NOT EXISTS idx_strategic_deliverables_status ON strategic_deliverables(status);

    -- Milestones indexes
    CREATE INDEX IF NOT EXISTS idx_strategic_milestones_parent ON strategic_milestones(parent_id, parent_type);
    CREATE INDEX IF NOT EXISTS idx_strategic_milestones_status ON strategic_milestones(status);
    CREATE INDEX IF NOT EXISTS idx_strategic_milestones_due ON strategic_milestones(due_date);

    -- Risks indexes
    CREATE INDEX IF NOT EXISTS idx_strategic_risks_plan ON strategic_risks(plan_id);
    CREATE INDEX IF NOT EXISTS idx_strategic_risks_level ON strategic_risks(risk_level);
    CREATE INDEX IF NOT EXISTS idx_strategic_risks_category ON strategic_risks(category);
    CREATE INDEX IF NOT EXISTS idx_strategic_risks_status ON strategic_risks(status);
    CREATE INDEX IF NOT EXISTS idx_strategic_risks_review ON strategic_risks(review_date);

    -- Mitigations indexes
    CREATE INDEX IF NOT EXISTS idx_strategic_mitigations_risk ON strategic_mitigations(risk_id);
    CREATE INDEX IF NOT EXISTS idx_strategic_mitigations_status ON strategic_mitigations(status);

    -- Stakeholders indexes
    CREATE INDEX IF NOT EXISTS idx_strategic_stakeholders_plan ON strategic_stakeholders(plan_id);
    CREATE INDEX IF NOT EXISTS idx_strategic_stakeholders_user ON strategic_stakeholders(user_id);
    CREATE INDEX IF NOT EXISTS idx_strategic_stakeholders_role ON strategic_stakeholders(role);

    -- Resources indexes
    CREATE INDEX IF NOT EXISTS idx_strategic_resources_plan ON strategic_resources(plan_id);
    CREATE INDEX IF NOT EXISTS idx_strategic_resources_type ON strategic_resources(type);
    CREATE INDEX IF NOT EXISTS idx_strategic_resources_status ON strategic_resources(status);

    -- KPIs indexes
    CREATE INDEX IF NOT EXISTS idx_strategic_kpis_plan ON strategic_kpis(plan_id);
    CREATE INDEX IF NOT EXISTS idx_strategic_kpis_frequency ON strategic_kpis(frequency);

    -- Activity log indexes
    CREATE INDEX IF NOT EXISTS idx_strategic_activities_plan ON strategic_plan_activities(plan_id);
    CREATE INDEX IF NOT EXISTS idx_strategic_activities_entity ON strategic_plan_activities(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_strategic_activities_created ON strategic_plan_activities(created_at DESC);

    -- ========================================================================
    -- TRIGGERS FOR updated_at
    -- ========================================================================

    -- Function to update updated_at timestamp
    CREATE OR REPLACE FUNCTION update_strategic_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Trigger for strategic_plans
    DROP TRIGGER IF EXISTS trigger_strategic_plans_updated ON strategic_plans;
    CREATE TRIGGER trigger_strategic_plans_updated
      BEFORE UPDATE ON strategic_plans
      FOR EACH ROW EXECUTE FUNCTION update_strategic_updated_at();

    -- Trigger for strategic_objectives
    DROP TRIGGER IF EXISTS trigger_strategic_objectives_updated ON strategic_objectives;
    CREATE TRIGGER trigger_strategic_objectives_updated
      BEFORE UPDATE ON strategic_objectives
      FOR EACH ROW EXECUTE FUNCTION update_strategic_updated_at();

    -- Trigger for strategic_initiatives
    DROP TRIGGER IF EXISTS trigger_strategic_initiatives_updated ON strategic_initiatives;
    CREATE TRIGGER trigger_strategic_initiatives_updated
      BEFORE UPDATE ON strategic_initiatives
      FOR EACH ROW EXECUTE FUNCTION update_strategic_updated_at();

    -- Trigger for strategic_key_results
    DROP TRIGGER IF EXISTS trigger_strategic_key_results_updated ON strategic_key_results;
    CREATE TRIGGER trigger_strategic_key_results_updated
      BEFORE UPDATE ON strategic_key_results
      FOR EACH ROW EXECUTE FUNCTION update_strategic_updated_at();
  `);

  console.log('[MIGRATION] Strategic planning tables created successfully');
}
