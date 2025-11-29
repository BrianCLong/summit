CREATE TABLE IF NOT EXISTS nps_responses (
    id SERIAL PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    event_name TEXT NOT NULL,
    properties JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nps_workspace ON nps_responses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_events_workspace ON analytics_events(workspace_id);
