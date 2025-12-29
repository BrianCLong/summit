-- Add entity references for entity comments

ALTER TABLE maestro.entity_comments
  ADD COLUMN IF NOT EXISTS entity_ref_id UUID;

UPDATE maestro.entity_comments
SET entity_ref_id = CASE
  WHEN entity_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    THEN entity_id::uuid
  ELSE NULL
END
WHERE entity_ref_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'entity_comments_entity_ref_id_fkey'
  ) THEN
    ALTER TABLE maestro.entity_comments
      ADD CONSTRAINT entity_comments_entity_ref_id_fkey
      FOREIGN KEY (entity_ref_id) REFERENCES entities(id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_entity_comments_entity_ref_id
  ON maestro.entity_comments(entity_ref_id);
