CREATE TABLE IF NOT EXISTS iocs (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    value TEXT NOT NULL,
    source VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS risk_assessments (
    id SERIAL PRIMARY KEY,
    ioc_id INTEGER REFERENCES iocs(id),
    risk_score FLOAT NOT NULL,
    risk_summary TEXT,
    model_version VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_iocs_value ON iocs(value);
CREATE INDEX idx_risk_assessments_ioc_id ON risk_assessments(ioc_id);
