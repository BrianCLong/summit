-- TimescaleDB Initialization for IntelGraph GA-Core
-- Committee Requirement: Temporal functions and hypertables for events

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Create events table for temporal analysis
CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    event_source VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB,
    confidence DECIMAL(5,4),
    severity VARCHAR(20),
    tags TEXT[]
);

-- Convert to hypertable (Committee requirement)
SELECT create_hypertable('events', 'observed_at', if_not_exists => TRUE);

-- Create time-based indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_type_time 
ON events (event_type, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_entity_time 
ON events (entity_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_source_time 
ON events (event_source, observed_at DESC);

-- GIN index for JSONB metadata
CREATE INDEX IF NOT EXISTS idx_events_metadata 
ON events USING gin (metadata);

-- Create temporal intelligence table
CREATE TABLE IF NOT EXISTS temporal_patterns (
    id BIGSERIAL PRIMARY KEY,
    pattern_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    time_window_start TIMESTAMPTZ NOT NULL,
    time_window_end TIMESTAMPTZ NOT NULL,
    pattern_data JSONB NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable
SELECT create_hypertable('temporal_patterns', 'time_window_start', if_not_exists => TRUE);

-- Create analytics table for Committee's Graph-XAI requirements  
CREATE TABLE IF NOT EXISTS analytics_traces (
    id BIGSERIAL PRIMARY KEY,
    trace_id UUID NOT NULL,
    operation_type VARCHAR(100) NOT NULL,
    execution_time TIMESTAMPTZ NOT NULL,
    duration_ms INTEGER NOT NULL,
    input_hash VARCHAR(64),
    output_hash VARCHAR(64),
    model_version VARCHAR(50),
    performance_metrics JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable for XAI traceability
SELECT create_hypertable('analytics_traces', 'execution_time', if_not_exists => TRUE);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO intelgraph;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO intelgraph;

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_analytics_traces_operation 
ON analytics_traces (operation_type, execution_time DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_traces_trace_id 
ON analytics_traces (trace_id);

COMMENT ON EXTENSION timescaledb IS 'IntelGraph GA-Core temporal intelligence foundation';
COMMENT ON TABLE events IS 'Committee Spec: Temporal events hypertable for intelligence analysis';
COMMENT ON TABLE temporal_patterns IS 'Committee Spec: Pattern detection and anomaly analysis';
COMMENT ON TABLE analytics_traces IS 'Committee Spec: XAI traceability and performance monitoring';
