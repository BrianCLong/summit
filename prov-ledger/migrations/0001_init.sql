CREATE TABLE claims (
    id TEXT PRIMARY KEY,
    text TEXT,
    normalized TEXT,
    created_at TEXT
);

CREATE TABLE evidence (
    id TEXT PRIMARY KEY,
    kind TEXT,
    url TEXT,
    hash TEXT,
    created_at TEXT
);

CREATE TABLE claim_evidence (
    claim_id TEXT,
    evidence_id TEXT
);
