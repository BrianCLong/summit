CREATE TABLE accounts (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accounts_email ON accounts (email);
