CREATE TABLE IF NOT EXISTS ingest_manifest (
  batch_id uuid PRIMARY KEY,
  source text not null,
  hash text not null,
  row_count int not null,
  created_at timestamptz default now()
);
