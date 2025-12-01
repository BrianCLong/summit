-- PsyOps Defense Toolkit Schema

-- Detected detection of influence campaigns and threats
CREATE TABLE IF NOT EXISTS psyops_threats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL,
    threat_level TEXT NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
    attack_vector TEXT,
    narrative TEXT,
    sentiment_score FLOAT,
    credibility_score FLOAT,
    status TEXT NOT NULL DEFAULT 'MONITORING',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psyops_threats_status ON psyops_threats(status);
CREATE INDEX IF NOT EXISTS idx_psyops_threats_created_at ON psyops_threats(created_at);
CREATE INDEX IF NOT EXISTS idx_psyops_threats_threat_level ON psyops_threats(threat_level);

-- Audit logs for specific psyops events and detections
CREATE TABLE IF NOT EXISTS psyops_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    threat_id UUID REFERENCES psyops_threats(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psyops_logs_threat_id ON psyops_logs(threat_id);

-- Countermeasures and defensive responses
CREATE TABLE IF NOT EXISTS psyops_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    threat_id UUID REFERENCES psyops_threats(id) ON DELETE SET NULL,
    response_type TEXT NOT NULL, -- COUNTER_NARRATIVE, FACT_CHECK, etc.
    content TEXT,
    channels JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'PENDING',
    effectiveness_score FLOAT,
    deployed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psyops_responses_threat_id ON psyops_responses(threat_id);
