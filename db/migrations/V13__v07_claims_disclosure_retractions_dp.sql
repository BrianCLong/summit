CREATE TABLE IF NOT EXISTS claimset(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid,
  step_id text,
  merkle_root text,
  signature text,
  signer text,
  issued_at timestamptz default now()
);
CREATE TABLE IF NOT EXISTS claim(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claimset_id uuid references claimset(id),
  type text,
  subject text,
  evidence_uri text,
  hash text
);
CREATE TABLE IF NOT EXISTS bundles(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid,
  step_id text,
  uri text,
  sha256 text,
  verified boolean default false,
  superseded_by text
);
CREATE TABLE IF NOT EXISTS retraction(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text,
  reason text,
  status text,
  created_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_claim_subject ON claim(subject);
CREATE TABLE IF NOT EXISTS dp_budgets(
  tenant text PRIMARY KEY,
  epsilon_remaining numeric NOT NULL,
  month date NOT NULL
);
