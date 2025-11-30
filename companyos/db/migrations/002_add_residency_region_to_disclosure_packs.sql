ALTER TABLE disclosure_packs
  ADD COLUMN IF NOT EXISTS residency_region TEXT;

UPDATE disclosure_packs
  SET residency_region = 'us'
  WHERE residency_region IS NULL;
