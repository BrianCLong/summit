-- HUMINT Sources Table
CREATE TABLE IF NOT EXISTS humint_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cryptonym TEXT NOT NULL,
  reliability TEXT NOT NULL, -- Enum: A, B, C, D, E, F
  access_level TEXT,
  status TEXT NOT NULL, -- Enum: RECRUITED, PAUSED, TERMINATED, BURNED
  recruited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  handler_id UUID NOT NULL, -- FK to users table ideally, but loose coupling allowed
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_humint_sources_tenant ON humint_sources(tenant_id);
CREATE INDEX idx_humint_sources_handler ON humint_sources(handler_id);

-- HUMINT Reports Table (INTREPs)
CREATE TABLE IF NOT EXISTS humint_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES humint_sources(id),
  content TEXT NOT NULL,
  grading TEXT NOT NULL, -- Enum: 1, 2, 3, 4, 5, 6
  status TEXT NOT NULL, -- Enum: DRAFT, SUBMITTED, VALIDATED, DISSEMINATED, REJECTED
  dissemination_list TEXT[], -- Array of strings (emails or user IDs)
  created_by UUID NOT NULL,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_humint_reports_tenant ON humint_reports(tenant_id);
CREATE INDEX idx_humint_reports_source ON humint_reports(source_id);

-- Debrief Sessions Table
CREATE TABLE IF NOT EXISTS humint_debriefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES humint_sources(id),
  session_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  location TEXT,
  notes TEXT,
  officer_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_humint_debriefs_tenant ON humint_debriefs(tenant_id);
CREATE INDEX idx_humint_debriefs_source ON humint_debriefs(source_id);

-- Collection Requirements Table
CREATE TABLE IF NOT EXISTS humint_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  priority TEXT NOT NULL, -- Enum: LOW, MEDIUM, HIGH, CRITICAL
  status TEXT NOT NULL DEFAULT 'OPEN', -- Enum: OPEN, FULFILLED, CANCELLED
  assigned_to UUID, -- Optional assignment
  deadline TIMESTAMP WITH TIME ZONE,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_humint_requirements_tenant ON humint_requirements(tenant_id);
