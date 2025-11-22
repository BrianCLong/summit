-- Example Licenses for Universal Ingestion + ETL Assistant
-- These can be loaded into the license registry database

-- 1. Open Data License (Permissive)
INSERT INTO licenses (id, name, type, version, terms, restrictions, compliance_level, created_at)
VALUES (
  'open-data-cc-by',
  'Creative Commons Attribution 4.0 International',
  'open_source',
  '4.0',
  '{"url": "https://creativecommons.org/licenses/by/4.0/", "summary": "Free to share and adapt with attribution"}',
  '{
    "commercial_use": true,
    "export_allowed": true,
    "research_only": false,
    "attribution_required": true,
    "share_alike": false,
    "internal_only": false,
    "no_third_party": false
  }',
  'allow',
  NOW()
);

-- 2. Restricted Partner License (Limited Export)
INSERT INTO licenses (id, name, type, version, terms, restrictions, compliance_level, created_at)
VALUES (
  'partner-restricted',
  'Commercial Partner License - Internal Use Only',
  'commercial',
  '1.0',
  '{"summary": "Licensed data for internal analysis only, export restricted"}',
  '{
    "commercial_use": true,
    "export_allowed": false,
    "research_only": false,
    "attribution_required": true,
    "share_alike": false,
    "internal_only": true,
    "no_third_party": true
  }',
  'warn',
  NOW()
);

-- 3. Research-Only License
INSERT INTO licenses (id, name, type, version, terms, restrictions, compliance_level, created_at)
VALUES (
  'research-only',
  'Academic Research License',
  'restricted',
  '1.0',
  '{"summary": "Data may only be used for non-commercial research purposes"}',
  '{
    "commercial_use": false,
    "export_allowed": false,
    "research_only": true,
    "attribution_required": true,
    "share_alike": true,
    "internal_only": true,
    "no_third_party": true
  }',
  'warn',
  NOW()
);

-- 4. Public Domain
INSERT INTO licenses (id, name, type, version, terms, restrictions, compliance_level, created_at)
VALUES (
  'public-domain',
  'Public Domain (CC0)',
  'public_domain',
  '1.0',
  '{"url": "https://creativecommons.org/publicdomain/zero/1.0/", "summary": "No copyright, free for any use"}',
  '{
    "commercial_use": true,
    "export_allowed": true,
    "research_only": false,
    "attribution_required": false,
    "share_alike": false,
    "internal_only": false,
    "no_third_party": false
  }',
  'allow',
  NOW()
);

-- 5. Government Restricted
INSERT INTO licenses (id, name, type, version, terms, restrictions, compliance_level, created_at)
VALUES (
  'gov-restricted',
  'Government Data - Restricted Distribution',
  'proprietary',
  '1.0',
  '{"summary": "Government-provided data with strict distribution controls"}',
  '{
    "commercial_use": false,
    "export_allowed": false,
    "research_only": false,
    "attribution_required": true,
    "share_alike": false,
    "internal_only": true,
    "no_third_party": true
  }',
  'block',
  NOW()
);

-- Example Data Sources using these licenses

INSERT INTO data_sources (id, name, source_type, license_id, tos_accepted, dpia_completed, pii_classification, retention_period, geographic_restrictions, created_at)
VALUES (
  'ds-public-census',
  'US Census Public Data',
  'csv',
  'public-domain',
  true,
  true,
  'low',
  365,
  '[]',
  NOW()
);

INSERT INTO data_sources (id, name, source_type, license_id, tos_accepted, dpia_completed, pii_classification, retention_period, geographic_restrictions, created_at)
VALUES (
  'ds-partner-crm',
  'Partner CRM Data',
  'rest-api',
  'partner-restricted',
  true,
  true,
  'high',
  90,
  '["CN", "RU"]', -- Example: restricted in China and Russia
  NOW()
);

INSERT INTO data_sources (id, name, source_type, license_id, tos_accepted, dpia_completed, pii_classification, retention_period, geographic_restrictions, created_at)
VALUES (
  'ds-research-survey',
  'Academic Survey Dataset',
  's3',
  'research-only',
  true,
  true,
  'medium',
  730,
  '[]',
  NOW()
);
