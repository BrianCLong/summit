-- Example for PostgreSQL
-- Add tiering column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'hot';
CREATE INDEX IF NOT EXISTS idx_events_tier ON events (tier);