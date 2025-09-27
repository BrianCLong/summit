-- Enable pgcrypto so Postgres can transparently encrypt pages written to disk.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- The `efs_encrypted` tablespace should be created with Postgres page-level encryption
-- (e.g. `CREATE TABLESPACE efs_encrypted LOCATION '.../efs' WITH (encryption = on);`).
CREATE TABLE IF NOT EXISTS efs_features (
    tenant_id TEXT NOT NULL,
    feature_key TEXT NOT NULL,
    sealed_blob BYTEA NOT NULL,
    policy_json JSONB NOT NULL,
    policy_hash BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, feature_key)
) TABLESPACE efs_encrypted;

CREATE INDEX IF NOT EXISTS idx_efs_features_policy_hash
    ON efs_features USING HASH (policy_hash);
