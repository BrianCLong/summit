-- Enterprise Support and Operations Platform Schema
-- Migration: 015_enterprise_support_schema.sql

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE ticket_status AS ENUM (
  'NEW',
  'OPEN',
  'IN_PROGRESS',
  'PENDING_CUSTOMER',
  'PENDING_INTERNAL',
  'RESOLVED',
  'CLOSED',
  'CANCELLED'
);

CREATE TYPE ticket_priority AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
  'CRITICAL'
);

CREATE TYPE ticket_severity AS ENUM (
  'SEV1', -- Critical business impact
  'SEV2', -- Major functionality impaired
  'SEV3', -- Minor issue, workaround available
  'SEV4'  -- Cosmetic or enhancement request
);

CREATE TYPE ticket_channel AS ENUM (
  'EMAIL',
  'CHAT',
  'PHONE',
  'PORTAL',
  'API',
  'INTEGRATION'
);

CREATE TYPE sla_tier AS ENUM (
  'BASIC',
  'PROFESSIONAL',
  'ENTERPRISE',
  'PREMIUM'
);

CREATE TYPE incident_severity AS ENUM (
  'P0', -- Critical - complete outage
  'P1', -- High - major degradation
  'P2', -- Medium - partial degradation
  'P3', -- Low - minor issues
  'P4'  -- Informational
);

CREATE TYPE incident_status AS ENUM (
  'INVESTIGATING',
  'IDENTIFIED',
  'MONITORING',
  'RESOLVED',
  'POST_MORTEM'
);

CREATE TYPE training_status AS ENUM (
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'EXPIRED',
  'FAILED'
);

CREATE TYPE certification_status AS ENUM (
  'ACTIVE',
  'EXPIRED',
  'REVOKED',
  'SUSPENDED'
);

CREATE TYPE onboarding_step_status AS ENUM (
  'PENDING',
  'COMPLETED',
  'SKIPPED',
  'FAILED'
);

CREATE TYPE health_status AS ENUM (
  'HEALTHY',
  'DEGRADED',
  'DOWN',
  'MAINTENANCE'
);

-- ============================================
-- HELP DESK AND TICKETING
-- ============================================

CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., TKT-2024-00001

  -- Customer information
  customer_user_id UUID REFERENCES users(id),
  customer_name VARCHAR(255),
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  organization VARCHAR(255),

  -- Ticket details
  subject VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'NEW',
  priority ticket_priority NOT NULL DEFAULT 'MEDIUM',
  severity ticket_severity NOT NULL DEFAULT 'SEV3',
  channel ticket_channel NOT NULL DEFAULT 'PORTAL',

  -- Assignment
  assigned_to UUID REFERENCES users(id),
  assigned_team VARCHAR(100),

  -- SLA tracking
  sla_tier sla_tier NOT NULL DEFAULT 'BASIC',
  response_due_at TIMESTAMP WITH TIME ZONE,
  resolution_due_at TIMESTAMP WITH TIME ZONE,
  first_response_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  tags TEXT[],
  category VARCHAR(100),
  subcategory VARCHAR(100),
  product VARCHAR(100),
  version VARCHAR(50),

  -- Satisfaction
  satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
  satisfaction_feedback TEXT,

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

CREATE TABLE ticket_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),

  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  is_solution BOOLEAN DEFAULT false,

  attachments JSONB, -- [{name, url, size, type}]

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ticket_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES ticket_comments(id) ON DELETE CASCADE,

  filename VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),

  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ticket_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,

  changed_by UUID REFERENCES users(id),
  change_type VARCHAR(50) NOT NULL, -- status_change, assignment, priority_change, etc.
  old_value TEXT,
  new_value TEXT,
  comment TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ticket_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),

  subject_template VARCHAR(500),
  description_template TEXT,
  default_priority ticket_priority,
  default_severity ticket_severity,
  default_tags TEXT[],

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE escalation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Conditions
  priority ticket_priority[],
  severity ticket_severity[],
  sla_tier sla_tier[],
  categories VARCHAR(100)[],

  -- Trigger conditions
  no_response_minutes INTEGER, -- Escalate if no response after X minutes
  no_resolution_minutes INTEGER, -- Escalate if not resolved after X minutes
  sla_breach_threshold DECIMAL(5,2), -- Escalate at X% of SLA time

  -- Actions
  escalate_to UUID REFERENCES users(id),
  escalate_to_team VARCHAR(100),
  notify_users UUID[],
  increase_priority BOOLEAN DEFAULT false,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- KNOWLEDGE BASE
-- ============================================

CREATE TABLE kb_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,

  -- Organization
  category VARCHAR(100),
  subcategory VARCHAR(100),
  tags TEXT[],

  -- Metadata
  author_id UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
  version INTEGER DEFAULT 1,

  -- SEO
  meta_description TEXT,
  keywords TEXT[],

  -- Analytics
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,

  -- Access control
  is_public BOOLEAN DEFAULT false,
  is_internal BOOLEAN DEFAULT false,

  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE kb_article_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,

  version INTEGER NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,

  changed_by UUID REFERENCES users(id),
  change_note TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE kb_faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100),

  order_index INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE kb_tutorials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  title VARCHAR(500) NOT NULL,
  description TEXT,
  difficulty VARCHAR(50), -- beginner, intermediate, advanced
  estimated_duration INTEGER, -- in minutes

  content TEXT,
  video_url TEXT,

  category VARCHAR(100),
  tags TEXT[],

  prerequisites TEXT[],
  learning_outcomes TEXT[],

  view_count INTEGER DEFAULT 0,
  completion_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TRAINING AND CERTIFICATION
-- ============================================

CREATE TABLE training_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  title VARCHAR(500) NOT NULL,
  description TEXT,
  learning_path VARCHAR(100), -- role-based learning path

  difficulty VARCHAR(50), -- beginner, intermediate, advanced
  estimated_hours DECIMAL(5,2),

  prerequisites TEXT[],
  learning_objectives TEXT[],

  is_certification_required BOOLEAN DEFAULT false,
  passing_score INTEGER DEFAULT 70,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE training_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,

  title VARCHAR(500) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,

  content TEXT,
  video_url TEXT,
  duration_minutes INTEGER,

  resources JSONB, -- Additional learning materials

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE training_labs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID REFERENCES training_modules(id) ON DELETE CASCADE,

  title VARCHAR(500) NOT NULL,
  description TEXT,
  instructions TEXT NOT NULL,

  environment_config JSONB, -- Lab environment setup
  sample_data JSONB,

  validation_criteria JSONB, -- How to validate completion

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_training_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,

  status training_status DEFAULT 'NOT_STARTED',
  progress_percentage DECIMAL(5,2) DEFAULT 0,

  current_module_id UUID REFERENCES training_modules(id),

  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(user_id, course_id)
);

CREATE TABLE certification_exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,

  title VARCHAR(500) NOT NULL,
  description TEXT,

  passing_score INTEGER DEFAULT 70,
  time_limit_minutes INTEGER,
  max_attempts INTEGER DEFAULT 3,

  questions JSONB NOT NULL, -- [{question, options, correct_answer, explanation}]

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE certification_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES certification_exams(id) ON DELETE CASCADE,

  score INTEGER,
  passed BOOLEAN,

  answers JSONB, -- User's answers

  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  time_taken_minutes INTEGER
);

CREATE TABLE certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,

  certificate_number VARCHAR(100) UNIQUE NOT NULL,
  status certification_status DEFAULT 'ACTIVE',

  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,

  badge_url TEXT,
  certificate_url TEXT
);

-- ============================================
-- ONBOARDING AUTOMATION
-- ============================================

CREATE TABLE onboarding_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,
  user_role user_role, -- Target role for this onboarding

  steps JSONB NOT NULL, -- [{title, description, type, config}]

  estimated_duration_minutes INTEGER,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_onboarding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES onboarding_templates(id),

  status VARCHAR(50) DEFAULT 'in_progress',
  current_step INTEGER DEFAULT 0,
  progress_percentage DECIMAL(5,2) DEFAULT 0,

  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(user_id, template_id)
);

CREATE TABLE onboarding_step_completion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  onboarding_id UUID NOT NULL REFERENCES user_onboarding(id) ON DELETE CASCADE,

  step_index INTEGER NOT NULL,
  step_name VARCHAR(255) NOT NULL,
  status onboarding_step_status DEFAULT 'PENDING',

  completed_at TIMESTAMP WITH TIME ZONE,
  skipped_at TIMESTAMP WITH TIME ZONE,

  metadata JSONB -- Additional data collected during step
);

-- ============================================
-- HEALTH MONITORING
-- ============================================

CREATE TABLE service_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  name VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  component_type VARCHAR(50), -- api, database, service, integration

  parent_id UUID REFERENCES service_components(id),

  is_critical BOOLEAN DEFAULT false,
  health_check_url TEXT,
  health_check_interval_seconds INTEGER DEFAULT 60,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE service_health_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  component_id UUID NOT NULL REFERENCES service_components(id) ON DELETE CASCADE,

  status health_status NOT NULL,
  response_time_ms INTEGER,

  error_message TEXT,
  metadata JSONB,

  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE system_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  incident_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,

  severity incident_severity NOT NULL,
  status incident_status DEFAULT 'INVESTIGATING',

  affected_components UUID[], -- Array of component IDs

  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,

  root_cause TEXT,
  resolution TEXT,

  created_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id)
);

CREATE TABLE incident_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES system_incidents(id) ON DELETE CASCADE,

  status incident_status NOT NULL,
  message TEXT NOT NULL,

  is_public BOOLEAN DEFAULT true, -- Show on status page

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE status_page_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),

  component_ids UUID[], -- Components to monitor

  notify_on_incidents BOOLEAN DEFAULT true,
  notify_on_maintenance BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(email)
);

-- ============================================
-- SLA MANAGEMENT
-- ============================================

CREATE TABLE sla_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  tier sla_tier NOT NULL,

  -- Response time targets (in minutes)
  sev1_response_minutes INTEGER DEFAULT 15,
  sev2_response_minutes INTEGER DEFAULT 60,
  sev3_response_minutes INTEGER DEFAULT 240,
  sev4_response_minutes INTEGER DEFAULT 1440,

  -- Resolution time targets (in minutes)
  sev1_resolution_minutes INTEGER DEFAULT 240,
  sev2_resolution_minutes INTEGER DEFAULT 1440,
  sev3_resolution_minutes INTEGER DEFAULT 10080, -- 7 days
  sev4_resolution_minutes INTEGER DEFAULT 43200, -- 30 days

  -- Uptime commitments
  uptime_percentage DECIMAL(5,2) DEFAULT 99.9,

  -- Support hours
  support_hours VARCHAR(100), -- 24x7, business_hours, etc.
  business_hours_start TIME,
  business_hours_end TIME,
  business_days INTEGER[], -- 1=Monday, 7=Sunday

  -- Credits
  credit_percentage_per_breach DECIMAL(5,2),
  max_credit_percentage DECIMAL(5,2),

  is_active BOOLEAN DEFAULT true,
  effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  effective_to TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sla_breaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  sla_definition_id UUID NOT NULL REFERENCES sla_definitions(id),

  breach_type VARCHAR(50) NOT NULL, -- response, resolution
  target_time TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_time TIMESTAMP WITH TIME ZONE,
  breach_minutes INTEGER,

  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,

  justification TEXT,

  credit_applied BOOLEAN DEFAULT false,
  credit_amount DECIMAL(10,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE uptime_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  component_id UUID NOT NULL REFERENCES service_components(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  uptime_percentage DECIMAL(5,2) NOT NULL,
  downtime_minutes INTEGER DEFAULT 0,

  incidents INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(component_id, date)
);

-- ============================================
-- 24/7 OPERATIONS
-- ============================================

CREATE TABLE on_call_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,
  team VARCHAR(100),

  timezone VARCHAR(50) DEFAULT 'UTC',

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE on_call_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES on_call_schedules(id) ON DELETE CASCADE,

  user_id UUID NOT NULL REFERENCES users(id),

  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,

  is_primary BOOLEAN DEFAULT true, -- Primary vs backup

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE runbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  title VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(100),

  trigger_conditions TEXT, -- When to use this runbook
  steps JSONB NOT NULL, -- [{title, description, commands, checks}]

  owner_id UUID REFERENCES users(id),

  last_used_at TIMESTAMP WITH TIME ZONE,
  use_count INTEGER DEFAULT 0,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE post_mortems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID REFERENCES system_incidents(id) ON DELETE SET NULL,

  title VARCHAR(500) NOT NULL,
  date DATE NOT NULL,

  summary TEXT NOT NULL,
  timeline JSONB, -- [{time, event, action}]

  root_cause TEXT NOT NULL,
  contributing_factors TEXT[],

  impact TEXT NOT NULL,
  affected_customers INTEGER,
  downtime_minutes INTEGER,
  revenue_impact DECIMAL(15,2),

  what_went_well TEXT[],
  what_went_wrong TEXT[],
  where_we_got_lucky TEXT[],

  action_items JSONB, -- [{description, owner, due_date, status}]

  facilitator_id UUID REFERENCES users(id),

  is_public BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CUSTOMER SUCCESS
-- ============================================

CREATE TABLE customer_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  account_name VARCHAR(255) NOT NULL,

  -- Account manager
  csm_user_id UUID REFERENCES users(id),
  account_executive_id UUID REFERENCES users(id),

  -- Health scoring
  health_score INTEGER CHECK (health_score BETWEEN 0 AND 100),
  health_trend VARCHAR(20), -- improving, stable, declining

  -- Contract info
  contract_start_date DATE,
  contract_end_date DATE,
  annual_contract_value DECIMAL(15,2),

  -- Engagement
  last_login_at TIMESTAMP WITH TIME ZONE,
  last_support_ticket_at TIMESTAMP WITH TIME ZONE,
  last_success_meeting_at TIMESTAMP WITH TIME ZONE,

  -- Risk factors
  churn_risk_score DECIMAL(5,2), -- 0-1 probability
  expansion_opportunity_score DECIMAL(5,2), -- 0-1 probability

  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE customer_health_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,

  metric_date DATE NOT NULL,

  -- Usage metrics
  active_users INTEGER,
  total_licensed_users INTEGER,
  feature_adoption_rate DECIMAL(5,2),

  -- Engagement metrics
  logins_count INTEGER,
  api_calls_count BIGINT,

  -- Support metrics
  support_tickets_count INTEGER,
  avg_satisfaction_score DECIMAL(3,2),

  -- Calculated health score
  health_score INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(account_id, metric_date)
);

CREATE TABLE success_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,

  title VARCHAR(500) NOT NULL,
  description TEXT,

  objectives TEXT[],
  success_criteria JSONB,

  start_date DATE,
  target_date DATE,

  status VARCHAR(50) DEFAULT 'active',
  progress_percentage DECIMAL(5,2) DEFAULT 0,

  owner_id UUID REFERENCES users(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE business_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,

  review_date DATE NOT NULL,
  title VARCHAR(500),

  attendees JSONB, -- [{name, role, company}]

  agenda TEXT[],
  discussion_notes TEXT,

  achievements TEXT[],
  challenges TEXT[],
  action_items JSONB,

  next_review_date DATE,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PROFESSIONAL SERVICES
-- ============================================

CREATE TABLE service_offerings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- implementation, migration, consulting, etc.

  estimated_hours INTEGER,
  rate_per_hour DECIMAL(10,2),

  deliverables TEXT[],
  prerequisites TEXT[],

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE service_engagements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES customer_accounts(id) ON DELETE CASCADE,
  offering_id UUID REFERENCES service_offerings(id),

  engagement_name VARCHAR(255) NOT NULL,
  description TEXT,

  status VARCHAR(50) DEFAULT 'planned', -- planned, active, completed, cancelled

  start_date DATE,
  target_completion_date DATE,
  actual_completion_date DATE,

  estimated_hours INTEGER,
  actual_hours DECIMAL(10,2),

  total_value DECIMAL(15,2),

  project_manager_id UUID REFERENCES users(id),

  deliverables JSONB,
  milestones JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE service_time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  engagement_id UUID NOT NULL REFERENCES service_engagements(id) ON DELETE CASCADE,

  user_id UUID NOT NULL REFERENCES users(id),

  work_date DATE NOT NULL,
  hours DECIMAL(5,2) NOT NULL,

  description TEXT,
  billable BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SUPPORT ANALYTICS
-- ============================================

CREATE TABLE support_metrics_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  metric_date DATE NOT NULL,

  -- Ticket volume
  tickets_created INTEGER DEFAULT 0,
  tickets_resolved INTEGER DEFAULT 0,
  tickets_closed INTEGER DEFAULT 0,

  -- Response times (in minutes)
  avg_first_response_time DECIMAL(10,2),
  median_first_response_time DECIMAL(10,2),
  p95_first_response_time DECIMAL(10,2),

  -- Resolution times (in minutes)
  avg_resolution_time DECIMAL(10,2),
  median_resolution_time DECIMAL(10,2),
  p95_resolution_time DECIMAL(10,2),

  -- SLA compliance
  sla_response_compliance_rate DECIMAL(5,2),
  sla_resolution_compliance_rate DECIMAL(5,2),

  -- Satisfaction
  avg_satisfaction_score DECIMAL(3,2),
  csat_responses INTEGER,
  nps_score INTEGER,

  -- Agent metrics
  active_agents INTEGER,
  avg_tickets_per_agent DECIMAL(5,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(tenant_id, metric_date)
);

CREATE TABLE agent_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  metric_date DATE NOT NULL,

  -- Volume
  tickets_handled INTEGER DEFAULT 0,
  tickets_resolved INTEGER DEFAULT 0,

  -- Quality
  avg_satisfaction_score DECIMAL(3,2),
  first_contact_resolution_rate DECIMAL(5,2),

  -- Efficiency
  avg_response_time_minutes DECIMAL(10,2),
  avg_resolution_time_minutes DECIMAL(10,2),

  -- SLA
  sla_compliance_rate DECIMAL(5,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, metric_date)
);

-- ============================================
-- INDEXES
-- ============================================

-- Support tickets
CREATE INDEX idx_support_tickets_tenant ON support_tickets(tenant_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_customer_email ON support_tickets(customer_email);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX idx_support_tickets_response_due ON support_tickets(response_due_at) WHERE status IN ('NEW', 'OPEN', 'IN_PROGRESS');
CREATE INDEX idx_support_tickets_resolution_due ON support_tickets(resolution_due_at) WHERE status IN ('NEW', 'OPEN', 'IN_PROGRESS');

-- Ticket comments
CREATE INDEX idx_ticket_comments_ticket ON ticket_comments(ticket_id);
CREATE INDEX idx_ticket_comments_created_at ON ticket_comments(created_at DESC);

-- Knowledge base
CREATE INDEX idx_kb_articles_tenant ON kb_articles(tenant_id);
CREATE INDEX idx_kb_articles_status ON kb_articles(status);
CREATE INDEX idx_kb_articles_category ON kb_articles(category);
CREATE INDEX idx_kb_articles_published ON kb_articles(published_at DESC) WHERE status = 'published';
CREATE INDEX idx_kb_articles_search ON kb_articles USING gin(to_tsvector('english', title || ' ' || content));

-- Training
CREATE INDEX idx_training_progress_user ON user_training_progress(user_id);
CREATE INDEX idx_training_progress_course ON user_training_progress(course_id);
CREATE INDEX idx_certifications_user ON certifications(user_id);

-- Health monitoring
CREATE INDEX idx_health_checks_component ON service_health_checks(component_id);
CREATE INDEX idx_health_checks_time ON service_health_checks(checked_at DESC);
CREATE INDEX idx_incidents_status ON system_incidents(status);
CREATE INDEX idx_incidents_severity ON system_incidents(severity);

-- SLA
CREATE INDEX idx_sla_breaches_ticket ON sla_breaches(ticket_id);
CREATE INDEX idx_sla_breaches_acknowledged ON sla_breaches(is_acknowledged) WHERE is_acknowledged = false;

-- Customer success
CREATE INDEX idx_customer_accounts_tenant ON customer_accounts(tenant_id);
CREATE INDEX idx_customer_accounts_csm ON customer_accounts(csm_user_id);
CREATE INDEX idx_customer_accounts_health ON customer_accounts(health_score);
CREATE INDEX idx_health_metrics_account ON customer_health_metrics(account_id);
CREATE INDEX idx_health_metrics_date ON customer_health_metrics(metric_date DESC);

-- Analytics
CREATE INDEX idx_support_metrics_tenant_date ON support_metrics_daily(tenant_id, metric_date DESC);
CREATE INDEX idx_agent_metrics_user_date ON agent_performance_metrics(user_id, metric_date DESC);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_articles_updated_at
  BEFORE UPDATE ON kb_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_accounts_updated_at
  BEFORE UPDATE ON customer_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-increment view count
CREATE OR REPLACE FUNCTION increment_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE kb_articles
  SET view_count = view_count + 1
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE support_tickets IS 'Multi-channel support ticket management with SLA tracking';
COMMENT ON TABLE kb_articles IS 'Knowledge base articles with versioning and analytics';
COMMENT ON TABLE training_courses IS 'Online training courses with role-based learning paths';
COMMENT ON TABLE sla_definitions IS 'SLA tier definitions with response and resolution targets';
COMMENT ON TABLE system_incidents IS 'System incident tracking for 24/7 operations';
COMMENT ON TABLE customer_accounts IS 'Customer success account management';
COMMENT ON TABLE service_engagements IS 'Professional services engagement tracking';
COMMENT ON TABLE support_metrics_daily IS 'Daily aggregated support analytics';
