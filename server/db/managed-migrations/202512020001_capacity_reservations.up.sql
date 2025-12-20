CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS capacity_reservations (
  reservation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,
  pool_id TEXT NOT NULL,
  compute_units INTEGER NOT NULL CHECK (compute_units > 0),
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capacity_reservations_tenant_pool_status_window
  ON capacity_reservations (tenant_id, pool_id, status, start_at, end_at);

CREATE INDEX IF NOT EXISTS idx_capacity_reservations_status_end
  ON capacity_reservations (status, end_at);
