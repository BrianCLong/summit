CREATE TABLE IF NOT EXISTS capacity_reservations (
  reservation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,
  pool_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);
