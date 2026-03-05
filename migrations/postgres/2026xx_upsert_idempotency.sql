-- Add stable row identity and gating token
ALTER TABLE public.your_table
  ADD COLUMN IF NOT EXISTS pk_digest text,
  ADD COLUMN IF NOT EXISTS last_applied_lsn bigint;

-- Optional: index to speed conflict checks / gating
CREATE INDEX IF NOT EXISTS your_table_pk_digest_idx ON public.your_table (pk_digest);
CREATE INDEX IF NOT EXISTS your_table_last_applied_lsn_idx ON public.your_table (last_applied_lsn);
