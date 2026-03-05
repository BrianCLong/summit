DROP TABLE IF EXISTS strategic_plan_activities CASCADE;
DROP TABLE IF EXISTS strategic_kpis CASCADE;
DROP TABLE IF EXISTS strategic_resources CASCADE;
DROP TABLE IF EXISTS strategic_stakeholders CASCADE;
DROP TABLE IF EXISTS strategic_mitigations CASCADE;
DROP TABLE IF EXISTS strategic_risks CASCADE;
DROP TABLE IF EXISTS strategic_milestones CASCADE;
DROP TABLE IF EXISTS strategic_deliverables CASCADE;
DROP TABLE IF EXISTS strategic_initiatives CASCADE;
DROP TABLE IF EXISTS strategic_key_results CASCADE;
DROP TABLE IF EXISTS strategic_objectives CASCADE;
DROP TABLE IF EXISTS strategic_plans CASCADE;

DROP TYPE IF EXISTS strategic_trend;
DROP TYPE IF EXISTS strategic_kpi_frequency;
DROP TYPE IF EXISTS strategic_stakeholder_role;
DROP TYPE IF EXISTS strategic_resource_status;
DROP TYPE IF EXISTS strategic_resource_type;
DROP TYPE IF EXISTS strategic_milestone_status;
DROP TYPE IF EXISTS strategic_risk_status;
DROP TYPE IF EXISTS strategic_risk_category;
DROP TYPE IF EXISTS strategic_risk_level;
DROP TYPE IF EXISTS strategic_initiative_type;
DROP TYPE IF EXISTS strategic_objective_status;
DROP TYPE IF EXISTS strategic_time_horizon;
DROP TYPE IF EXISTS strategic_priority;
DROP TYPE IF EXISTS strategic_plan_status;

DROP FUNCTION IF EXISTS update_strategic_updated_at();
