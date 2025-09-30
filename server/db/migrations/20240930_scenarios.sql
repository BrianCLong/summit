CREATE TABLE IF NOT EXISTS scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  params jsonb NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);