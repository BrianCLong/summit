-- Integration test database initialization
-- Creates test schemas and sample data for IntelGraph integration tests

-- Create test schemas
CREATE SCHEMA IF NOT EXISTS entities;
CREATE SCHEMA IF NOT EXISTS relationships;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS audit;

-- Create test tables
CREATE TABLE IF NOT EXISTS entities.test_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS relationships.test_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL,
    target_id UUID NOT NULL,
    relationship_type VARCHAR(100) NOT NULL,
    confidence FLOAT DEFAULT 1.0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit.test_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id VARCHAR(255)
);

-- Insert sample test data
INSERT INTO entities.test_entities (name, type, metadata) VALUES
    ('Test Entity 1', 'person', '{"source": "test"}'),
    ('Test Entity 2', 'organization', '{"source": "test"}'),
    ('Test Entity 3', 'location', '{"source": "test"}');

-- Create test user for integration tests
CREATE USER IF NOT EXISTS intelgraph_test WITH PASSWORD 'test_password';
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA entities TO intelgraph_test;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA relationships TO intelgraph_test;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA analytics TO intelgraph_test;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA audit TO intelgraph_test;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA entities TO intelgraph_test;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA relationships TO intelgraph_test;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA analytics TO intelgraph_test;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA audit TO intelgraph_test;