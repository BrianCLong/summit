
-- Migration: Create License Registry Tables
-- Epic: E15 Data Intake

CREATE TABLE IF NOT EXISTS licenses (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  compliance_level VARCHAR(50) NOT NULL CHECK (compliance_level IN ('allow', 'warn', 'block')),
  restrictions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS data_sources (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  license_id VARCHAR(255) REFERENCES licenses(id),
  config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_data_sources_license_id ON data_sources(license_id);
CREATE INDEX idx_data_sources_type ON data_sources(type);

-- Seed some default licenses
INSERT INTO licenses (id, name, compliance_level, restrictions) VALUES
('cc-by-4.0', 'Creative Commons Attribution 4.0', 'allow', '{"attributionRequired": true, "commercialUse": true, "exportAllowed": true}'),
('proprietary-internal', 'Internal Proprietary', 'allow', '{"attributionRequired": false, "commercialUse": true, "exportAllowed": false}'),
('restricted-3rd-party', 'Restricted Third Party', 'warn', '{"attributionRequired": true, "commercialUse": false, "exportAllowed": false}');
