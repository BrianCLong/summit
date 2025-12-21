
-- Up Migration
CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    archetype TEXT NOT NULL,
    motions TEXT[] NOT NULL,
    tier TEXT NOT NULL,
    status TEXT NOT NULL,
    icp_alignment JSONB NOT NULL DEFAULT '{}',
    scorecard JSONB NOT NULL DEFAULT '{}',
    targets JSONB NOT NULL DEFAULT '[]',
    channel_conflict_rules JSONB NOT NULL DEFAULT '{}',
    onboarding_status JSONB NOT NULL DEFAULT '{}',
    legal JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Down Migration
DROP TABLE IF NOT EXISTS partners;
