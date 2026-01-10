-- IntelGraph Platform Database Schema
-- Sprint 0 Baseline Schema

-- Create staging table for ingested entities
CREATE TABLE IF NOT EXISTS staging_entities (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT,
    attributes JSONB DEFAULT '{}'::jsonb,
    pii_flags JSONB DEFAULT '{}'::jsonb,
    source_id TEXT NOT NULL,
    provenance JSONB,
    retention_tier TEXT DEFAULT 'standard-365d',
    purpose TEXT DEFAULT 'investigation',
    region TEXT DEFAULT 'US',
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS ix_staging_entities_type ON staging_entities(type);
CREATE INDEX IF NOT EXISTS ix_staging_entities_source ON staging_entities(source_id);
CREATE INDEX IF NOT EXISTS ix_staging_entities_purpose ON staging_entities(purpose);
CREATE INDEX IF NOT EXISTS ix_staging_entities_region ON staging_entities(region);
CREATE INDEX IF NOT EXISTS ix_staging_entities_gin ON staging_entities USING GIN (attributes);
CREATE INDEX IF NOT EXISTS ix_staging_entities_created ON staging_entities(created_at);

-- Create provenance ledger table
CREATE TABLE IF NOT EXISTS provenance_ledger (
    id SERIAL PRIMARY KEY,
    subject_id TEXT NOT NULL,
    activity TEXT NOT NULL,
    actor TEXT NOT NULL,
    hash TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    attestation JSONB
);

CREATE INDEX IF NOT EXISTS ix_provenance_subject ON provenance_ledger(subject_id);
CREATE INDEX IF NOT EXISTS ix_provenance_timestamp ON provenance_ledger(timestamp);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO intelgraph;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO intelgraph;

-- Insert sample data for development
INSERT INTO staging_entities (id, type, name, attributes, source_id, purpose) VALUES
('demo:entity-001', 'indicator', 'suspicious-domain.com', '{"indicator_type": "domain", "confidence": 0.85}', 's3:demo-entities', 'threat-intel'),
('demo:entity-002', 'entity', 'Organization Alpha', '{"org_type": "corporate", "sector": "technology"}', 's3:demo-entities', 'investigation'),
('demo:entity-003', 'indicator', '192.168.1.100', '{"indicator_type": "ip", "confidence": 0.72}', 'http:threat-intel-feed', 'threat-intel'),
('demo:entity-004', 'entity', 'Project Beta', '{"project_type": "research", "classification": "internal"}', 's3:demo-entities', 'investigation'),
('demo:entity-005', 'insight', 'Anomalous Activity Pattern', '{"insight_type": "behavioral", "score": 0.91}', 'http:topicality-insights', 'enrichment')
ON CONFLICT (id) DO NOTHING;
