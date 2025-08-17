ALTER TABLE investigations ADD COLUMN IF NOT EXISTS custom_schema JSONB DEFAULT '[]';
