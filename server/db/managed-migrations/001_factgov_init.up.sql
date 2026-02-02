CREATE TABLE factgov_agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE factgov_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    tags TEXT[],
    compliance_status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE factgov_validators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    accreditation_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE factgov_rfps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES factgov_agencies(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    budget_range TEXT,
    status TEXT DEFAULT 'OPEN',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE factgov_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfp_id UUID NOT NULL REFERENCES factgov_rfps(id),
    vendor_id UUID NOT NULL REFERENCES factgov_vendors(id),
    score FLOAT,
    match_details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE factgov_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    details JSONB,
    previous_hash TEXT,
    hash TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_factgov_vendors_tags ON factgov_vendors USING GIN(tags);
CREATE INDEX idx_factgov_rfps_agency ON factgov_rfps(agency_id);
CREATE INDEX idx_factgov_matches_rfp ON factgov_matches(rfp_id);
CREATE INDEX idx_factgov_audits_entity ON factgov_audits(entity_type, entity_id);
