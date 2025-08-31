CREATE TABLE IF NOT EXISTS tenant_recommendations (
    id bigserial PRIMARY KEY,
    tenant_id text NOT NULL,
    kind text NOT NULL, -- e.g., upgrade, budget
    summary text NOT NULL,
    evidence jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz
);

insert into tenant_recommendations(tenant_id, kind, summary, evidence)
values
('tnt-team-b43f','upgrade','Team→Business: repeated exploration cap hits','{"hits":45,"expert":"rag_retrieval"}'::jsonb),
('tnt-team-c81a','upgrade','Team→Business: repeated exploration cap hits','{"hits":31,"expert":"graph_ops"}'::jsonb),
('tnt-biz-a9d2','budget','Business budget overdrafts','{"events":3}'::jsonb);
