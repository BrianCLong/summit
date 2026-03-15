-- Architecture Governance Council Schema
-- Tables for managing council registry, proposals, and voting mechanisms.

CREATE TABLE IF NOT EXISTS council_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL DEFAULT 'global',
    role TEXT NOT NULL DEFAULT 'MEMBER', -- MEMBER, CHAIR
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(user_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS architectural_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    proposer_id UUID NOT NULL REFERENCES users(id),
    tenant_id TEXT NOT NULL DEFAULT 'global',
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, SUPERSEDED
    metadata JSONB DEFAULT '{}',
    evidence_bundle_uri TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS council_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES architectural_proposals(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES users(id),
    vote TEXT NOT NULL, -- YES, NO, ABSTAIN
    reason TEXT,
    evidence_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(proposal_id, voter_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_proposals_status ON architectural_proposals(status);
CREATE INDEX IF NOT EXISTS idx_votes_proposal ON council_votes(proposal_id);
