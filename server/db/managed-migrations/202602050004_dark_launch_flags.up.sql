
-- Dark Launch Capability
-- Task #107
-- SAFE: Creating indexes on new tables is safe.

CREATE TABLE IF NOT EXISTS dark_launch_flags (
  subsystem TEXT NOT NULL,
  feature TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  sampling_rate DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  is_shadow_only BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (subsystem, feature)
);

CREATE INDEX IF NOT EXISTS idx_dark_launch_subsystem ON dark_launch_flags(subsystem);
