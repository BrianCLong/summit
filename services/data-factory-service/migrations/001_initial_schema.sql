-- Data Factory Service - Initial Schema Migration
-- Version: 001
-- Description: Creates all tables for dataset management, labeling workflows, and training data curation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Enum Types
-- ============================================================================

CREATE TYPE split_type AS ENUM ('train', 'dev', 'test', 'validation');

CREATE TYPE task_type AS ENUM (
  'entity_match',
  'entity_no_match',
  'cluster_review',
  'claim_assessment',
  'safety_decision',
  'relationship_validation',
  'text_classification',
  'named_entity_recognition',
  'sequence_labeling'
);

CREATE TYPE label_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'needs_review',
  'approved',
  'rejected'
);

CREATE TYPE dataset_status AS ENUM ('draft', 'active', 'archived', 'deprecated');

CREATE TYPE annotator_role AS ENUM ('annotator', 'reviewer', 'admin', 'quality_lead');

CREATE TYPE job_status AS ENUM (
  'queued',
  'assigned',
  'in_progress',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'escalated'
);

CREATE TYPE license_type AS ENUM (
  'internal',
  'public_domain',
  'cc_by',
  'cc_by_sa',
  'cc_by_nc',
  'proprietary',
  'restricted',
  'government'
);

CREATE TYPE export_format AS ENUM ('jsonl', 'parquet', 'csv', 'json');

CREATE TYPE export_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TYPE workflow_status AS ENUM ('draft', 'active', 'paused', 'completed');

CREATE TYPE pii_handling AS ENUM ('remove', 'mask', 'encrypt', 'allow');

CREATE TYPE sensitivity_level AS ENUM ('public', 'internal', 'confidential', 'restricted');

CREATE TYPE audit_level AS ENUM ('minimal', 'standard', 'comprehensive');

CREATE TYPE redaction_type AS ENUM ('remove', 'mask', 'hash', 'generalize');

CREATE TYPE disagreement_resolution AS ENUM ('majority_vote', 'expert_review', 'adjudication');

CREATE TYPE sampling_strategy AS ENUM ('all', 'random', 'stratified', 'active_learning');

CREATE TYPE stage_type AS ENUM ('annotation', 'review', 'adjudication', 'export');

-- ============================================================================
-- Policy Profiles Table
-- ============================================================================

CREATE TABLE policy_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id VARCHAR(255) UNIQUE NOT NULL,
  profile_name VARCHAR(255) NOT NULL,
  allowed_use_cases JSONB NOT NULL DEFAULT '[]',
  prohibited_use_cases JSONB NOT NULL DEFAULT '[]',
  required_redactions JSONB NOT NULL DEFAULT '[]',
  pii_handling pii_handling NOT NULL DEFAULT 'mask',
  sensitivity_level sensitivity_level NOT NULL DEFAULT 'internal',
  audit_level audit_level NOT NULL DEFAULT 'standard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policy_profiles_profile_id ON policy_profiles(profile_id);

-- ============================================================================
-- Retention Policies Table
-- ============================================================================

CREATE TABLE retention_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id VARCHAR(255) UNIQUE NOT NULL,
  policy_name VARCHAR(255) NOT NULL,
  retention_days INTEGER NOT NULL,
  archive_after_days INTEGER,
  delete_after_days INTEGER,
  audit_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_retention_policies_policy_id ON retention_policies(policy_id);

-- ============================================================================
-- Datasets Table
-- ============================================================================

CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  status dataset_status NOT NULL DEFAULT 'draft',
  task_type task_type NOT NULL,
  use_case VARCHAR(255) NOT NULL,
  model_target VARCHAR(255),
  sample_count INTEGER NOT NULL DEFAULT 0,
  labeled_sample_count INTEGER NOT NULL DEFAULT 0,

  -- Provenance
  source_provenance JSONB NOT NULL,

  -- License
  license_id VARCHAR(255) NOT NULL,
  license_type license_type NOT NULL,
  license_text TEXT,
  license_url VARCHAR(500),
  attribution_required BOOLEAN NOT NULL DEFAULT false,
  commercial_use_allowed BOOLEAN NOT NULL DEFAULT false,
  derivative_works_allowed BOOLEAN NOT NULL DEFAULT false,
  sharing_allowed BOOLEAN NOT NULL DEFAULT false,
  license_expiration_date TIMESTAMPTZ,

  -- Jurisdiction
  jurisdiction VARCHAR(100) NOT NULL,
  data_localization_required BOOLEAN NOT NULL DEFAULT false,
  retention_policy_id VARCHAR(255) REFERENCES retention_policies(policy_id),
  compliance_frameworks JSONB NOT NULL DEFAULT '[]',
  export_restrictions JSONB NOT NULL DEFAULT '[]',

  -- Policy
  policy_profile_id VARCHAR(255) REFERENCES policy_profiles(profile_id),

  -- Schema
  schema_definition JSONB NOT NULL,

  -- Quality metrics
  quality_metrics JSONB NOT NULL DEFAULT '{}',

  -- Metadata
  tags JSONB NOT NULL DEFAULT '[]',
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  CONSTRAINT datasets_name_version_unique UNIQUE (name, version)
);

CREATE INDEX idx_datasets_status ON datasets(status);
CREATE INDEX idx_datasets_task_type ON datasets(task_type);
CREATE INDEX idx_datasets_use_case ON datasets(use_case);
CREATE INDEX idx_datasets_created_by ON datasets(created_by);
CREATE INDEX idx_datasets_created_at ON datasets(created_at);
CREATE INDEX idx_datasets_tags ON datasets USING GIN(tags);

-- ============================================================================
-- Dataset Splits Table
-- ============================================================================

CREATE TABLE dataset_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  split_type split_type NOT NULL,
  sample_count INTEGER NOT NULL DEFAULT 0,
  percentage DECIMAL(5,2) NOT NULL,
  seed INTEGER NOT NULL,
  stratify_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT dataset_splits_unique UNIQUE (dataset_id, split_type)
);

CREATE INDEX idx_dataset_splits_dataset_id ON dataset_splits(dataset_id);

-- ============================================================================
-- Samples Table
-- ============================================================================

CREATE TABLE samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  external_id VARCHAR(255),
  content JSONB NOT NULL,

  -- Metadata
  source_id VARCHAR(255) NOT NULL,
  source_name VARCHAR(255) NOT NULL,
  collection_date TIMESTAMPTZ NOT NULL,
  original_format VARCHAR(100) NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  content_size INTEGER NOT NULL,
  language VARCHAR(10),
  domain VARCHAR(100),
  custom_fields JSONB NOT NULL DEFAULT '{}',

  -- Status
  split split_type,
  status label_status NOT NULL DEFAULT 'pending',
  is_golden BOOLEAN NOT NULL DEFAULT false,
  expected_label JSONB,
  priority INTEGER NOT NULL DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT samples_external_id_unique UNIQUE (dataset_id, external_id)
);

CREATE INDEX idx_samples_dataset_id ON samples(dataset_id);
CREATE INDEX idx_samples_status ON samples(status);
CREATE INDEX idx_samples_split ON samples(split);
CREATE INDEX idx_samples_is_golden ON samples(is_golden);
CREATE INDEX idx_samples_priority ON samples(priority DESC);
CREATE INDEX idx_samples_content_hash ON samples(content_hash);
CREATE INDEX idx_samples_created_at ON samples(created_at);

-- ============================================================================
-- Annotators Table
-- ============================================================================

CREATE TABLE annotators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role annotator_role NOT NULL DEFAULT 'annotator',
  task_types JSONB NOT NULL DEFAULT '[]',
  qualifications JSONB NOT NULL DEFAULT '[]',

  -- Performance metrics
  total_labeled INTEGER NOT NULL DEFAULT 0,
  accuracy DECIMAL(5,4) NOT NULL DEFAULT 0,
  golden_question_accuracy DECIMAL(5,4) NOT NULL DEFAULT 0,
  average_time_per_task DECIMAL(10,2) NOT NULL DEFAULT 0,
  agreement_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
  rejection_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
  last_active_at TIMESTAMPTZ,

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_annotators_user_id ON annotators(user_id);
CREATE INDEX idx_annotators_role ON annotators(role);
CREATE INDEX idx_annotators_is_active ON annotators(is_active);

-- ============================================================================
-- Label Sets Table
-- ============================================================================

CREATE TABLE label_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  annotator_id UUID NOT NULL REFERENCES annotators(id),
  annotator_role annotator_role NOT NULL,
  task_type task_type NOT NULL,
  labels JSONB NOT NULL,
  confidence DECIMAL(5,4),
  notes TEXT,
  time_spent INTEGER NOT NULL DEFAULT 0,
  status label_status NOT NULL DEFAULT 'pending',

  -- Review
  reviewer_id UUID REFERENCES annotators(id),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_label_sets_sample_id ON label_sets(sample_id);
CREATE INDEX idx_label_sets_annotator_id ON label_sets(annotator_id);
CREATE INDEX idx_label_sets_status ON label_sets(status);
CREATE INDEX idx_label_sets_created_at ON label_sets(created_at);

-- ============================================================================
-- Labeling Jobs Table
-- ============================================================================

CREATE TABLE labeling_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  task_type task_type NOT NULL,
  annotator_id UUID REFERENCES annotators(id),
  status job_status NOT NULL DEFAULT 'queued',
  priority INTEGER NOT NULL DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),

  assigned_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,

  instructions TEXT NOT NULL,
  label_schema_id VARCHAR(255) NOT NULL,
  previous_labels JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_labeling_jobs_dataset_id ON labeling_jobs(dataset_id);
CREATE INDEX idx_labeling_jobs_sample_id ON labeling_jobs(sample_id);
CREATE INDEX idx_labeling_jobs_annotator_id ON labeling_jobs(annotator_id);
CREATE INDEX idx_labeling_jobs_status ON labeling_jobs(status);
CREATE INDEX idx_labeling_jobs_priority ON labeling_jobs(priority DESC);
CREATE INDEX idx_labeling_jobs_task_type ON labeling_jobs(task_type);

-- ============================================================================
-- Labeling Queues Table
-- ============================================================================

CREATE TABLE labeling_queues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  task_type task_type NOT NULL,
  total_jobs INTEGER NOT NULL DEFAULT 0,
  pending_jobs INTEGER NOT NULL DEFAULT 0,
  assigned_jobs INTEGER NOT NULL DEFAULT 0,
  completed_jobs INTEGER NOT NULL DEFAULT 0,
  annotator_ids JSONB NOT NULL DEFAULT '[]',

  -- Quality settings
  golden_question_frequency DECIMAL(5,4) NOT NULL DEFAULT 0.1,
  min_agreement_threshold DECIMAL(5,4) NOT NULL DEFAULT 0.8,
  review_sampling_rate DECIMAL(5,4) NOT NULL DEFAULT 0.2,
  max_annotations_per_sample INTEGER NOT NULL DEFAULT 3,
  disagreement_resolution disagreement_resolution NOT NULL DEFAULT 'majority_vote',
  auto_approval_threshold DECIMAL(5,4),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_labeling_queues_dataset_id ON labeling_queues(dataset_id);
CREATE INDEX idx_labeling_queues_task_type ON labeling_queues(task_type);

-- ============================================================================
-- Labeling Workflows Table
-- ============================================================================

CREATE TABLE labeling_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  task_type task_type NOT NULL,
  stages JSONB NOT NULL,
  current_stage_index INTEGER NOT NULL DEFAULT 0,
  status workflow_status NOT NULL DEFAULT 'draft',

  -- Quality settings
  golden_question_frequency DECIMAL(5,4) NOT NULL DEFAULT 0.1,
  min_agreement_threshold DECIMAL(5,4) NOT NULL DEFAULT 0.8,
  review_sampling_rate DECIMAL(5,4) NOT NULL DEFAULT 0.2,
  max_annotations_per_sample INTEGER NOT NULL DEFAULT 3,
  disagreement_resolution disagreement_resolution NOT NULL DEFAULT 'majority_vote',
  auto_approval_threshold DECIMAL(5,4),

  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_labeling_workflows_dataset_id ON labeling_workflows(dataset_id);
CREATE INDEX idx_labeling_workflows_status ON labeling_workflows(status);

-- ============================================================================
-- Dataset Exports Table
-- ============================================================================

CREATE TABLE dataset_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  dataset_version VARCHAR(50) NOT NULL,
  format export_format NOT NULL,
  splits JSONB NOT NULL DEFAULT '[]',
  filter_criteria JSONB,
  redaction_rules JSONB NOT NULL DEFAULT '[]',
  status export_status NOT NULL DEFAULT 'pending',

  file_path VARCHAR(500),
  file_size BIGINT,
  file_hash VARCHAR(64),
  sample_count INTEGER NOT NULL DEFAULT 0,

  exported_by VARCHAR(255) NOT NULL,
  policy_profile_id VARCHAR(255) REFERENCES policy_profiles(profile_id),

  -- Metadata
  export_metadata JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_dataset_exports_dataset_id ON dataset_exports(dataset_id);
CREATE INDEX idx_dataset_exports_status ON dataset_exports(status);
CREATE INDEX idx_dataset_exports_exported_by ON dataset_exports(exported_by);

-- ============================================================================
-- Governance Checks Table
-- ============================================================================

CREATE TABLE governance_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  check_type VARCHAR(100) NOT NULL,
  passed BOOLEAN NOT NULL,
  violations JSONB NOT NULL DEFAULT '[]',
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  policy_version VARCHAR(50) NOT NULL
);

CREATE INDEX idx_governance_checks_sample_id ON governance_checks(sample_id);
CREATE INDEX idx_governance_checks_dataset_id ON governance_checks(dataset_id);
CREATE INDEX idx_governance_checks_passed ON governance_checks(passed);

-- ============================================================================
-- Audit Log Table
-- ============================================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  actor_id VARCHAR(255) NOT NULL,
  actor_role VARCHAR(50) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  previous_state JSONB,
  new_state JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_datasets_updated_at
  BEFORE UPDATE ON datasets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_samples_updated_at
  BEFORE UPDATE ON samples
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_annotators_updated_at
  BEFORE UPDATE ON annotators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_label_sets_updated_at
  BEFORE UPDATE ON label_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_labeling_jobs_updated_at
  BEFORE UPDATE ON labeling_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_labeling_queues_updated_at
  BEFORE UPDATE ON labeling_queues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_labeling_workflows_updated_at
  BEFORE UPDATE ON labeling_workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_policy_profiles_updated_at
  BEFORE UPDATE ON policy_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_retention_policies_updated_at
  BEFORE UPDATE ON retention_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update dataset sample counts
CREATE OR REPLACE FUNCTION update_dataset_sample_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE datasets
    SET
      sample_count = (SELECT COUNT(*) FROM samples WHERE dataset_id = NEW.dataset_id),
      labeled_sample_count = (SELECT COUNT(*) FROM samples WHERE dataset_id = NEW.dataset_id AND status IN ('completed', 'approved'))
    WHERE id = NEW.dataset_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE datasets
    SET
      sample_count = (SELECT COUNT(*) FROM samples WHERE dataset_id = OLD.dataset_id),
      labeled_sample_count = (SELECT COUNT(*) FROM samples WHERE dataset_id = OLD.dataset_id AND status IN ('completed', 'approved'))
    WHERE id = OLD.dataset_id;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dataset_counts_on_sample_change
  AFTER INSERT OR UPDATE OR DELETE ON samples
  FOR EACH ROW EXECUTE FUNCTION update_dataset_sample_counts();

-- Function to update queue job counts
CREATE OR REPLACE FUNCTION update_queue_job_counts()
RETURNS TRIGGER AS $$
DECLARE
  queue_id_var UUID;
BEGIN
  -- Find the associated queue
  SELECT id INTO queue_id_var FROM labeling_queues
  WHERE dataset_id = COALESCE(NEW.dataset_id, OLD.dataset_id)
  AND task_type = COALESCE(NEW.task_type, OLD.task_type)
  LIMIT 1;

  IF queue_id_var IS NOT NULL THEN
    UPDATE labeling_queues
    SET
      total_jobs = (SELECT COUNT(*) FROM labeling_jobs WHERE dataset_id = labeling_queues.dataset_id AND task_type = labeling_queues.task_type),
      pending_jobs = (SELECT COUNT(*) FROM labeling_jobs WHERE dataset_id = labeling_queues.dataset_id AND task_type = labeling_queues.task_type AND status = 'queued'),
      assigned_jobs = (SELECT COUNT(*) FROM labeling_jobs WHERE dataset_id = labeling_queues.dataset_id AND task_type = labeling_queues.task_type AND status IN ('assigned', 'in_progress')),
      completed_jobs = (SELECT COUNT(*) FROM labeling_jobs WHERE dataset_id = labeling_queues.dataset_id AND task_type = labeling_queues.task_type AND status IN ('approved', 'submitted'))
    WHERE id = queue_id_var;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_queue_counts_on_job_change
  AFTER INSERT OR UPDATE OR DELETE ON labeling_jobs
  FOR EACH ROW EXECUTE FUNCTION update_queue_job_counts();

-- ============================================================================
-- Initial Data
-- ============================================================================

-- Insert default policy profiles
INSERT INTO policy_profiles (profile_id, profile_name, allowed_use_cases, prohibited_use_cases, required_redactions, pii_handling, sensitivity_level, audit_level)
VALUES
  ('default-internal', 'Default Internal', '["model-training", "analytics", "research"]', '["external-sharing"]', '["ssn", "credit_card"]', 'mask', 'internal', 'standard'),
  ('public-release', 'Public Release', '["model-training", "analytics", "research", "external-sharing"]', '[]', '["ssn", "credit_card", "phone", "email", "address"]', 'remove', 'public', 'comprehensive'),
  ('restricted-research', 'Restricted Research', '["research"]', '["model-training", "analytics", "external-sharing"]', '[]', 'encrypt', 'restricted', 'comprehensive');

-- Insert default retention policies
INSERT INTO retention_policies (policy_id, policy_name, retention_days, archive_after_days, delete_after_days, audit_required)
VALUES
  ('standard-90', 'Standard 90-Day', 90, 60, 90, true),
  ('extended-365', 'Extended 1-Year', 365, 180, 365, true),
  ('permanent', 'Permanent Retention', 36500, NULL, NULL, true);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE datasets IS 'Training datasets with provenance, licensing, and policy metadata';
COMMENT ON TABLE samples IS 'Individual data samples within datasets';
COMMENT ON TABLE label_sets IS 'Labels applied to samples by annotators';
COMMENT ON TABLE labeling_jobs IS 'Task assignments for annotation work';
COMMENT ON TABLE labeling_workflows IS 'Multi-stage labeling workflow definitions';
COMMENT ON TABLE dataset_exports IS 'Export jobs and versioned dataset releases';
COMMENT ON TABLE governance_checks IS 'Policy compliance checks for samples';
COMMENT ON TABLE audit_log IS 'Full audit trail of all operations';
