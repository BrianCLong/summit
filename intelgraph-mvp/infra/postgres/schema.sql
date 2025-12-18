CREATE TABLE IF NOT EXISTS provenance_ledger (
    id SERIAL PRIMARY KEY,
    ingest_id UUID NOT NULL,
    source_hash VARCHAR(256) NOT NULL,
    transformed_hash VARCHAR(256),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);
