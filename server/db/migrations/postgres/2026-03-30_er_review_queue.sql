CREATE TABLE IF NOT EXISTS er_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  entity_a_id TEXT NOT NULL,
  entity_b_id TEXT NOT NULL,
  similarity_score FLOAT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, resolved_merge, resolved_distinct, skipped
  reviewer_id TEXT,
  decision_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_er_queue_tenant_status ON er_review_queue(tenant_id, status);
