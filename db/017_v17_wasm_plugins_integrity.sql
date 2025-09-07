CREATE TABLE IF NOT EXISTS plugin_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  version text NOT NULL,
  oci_uri text NOT NULL,
  digest text NOT NULL,             -- sha256:...
  signature text NOT NULL,          -- cosign sig or bundle ref
  sbom jsonb,                       -- CycloneDX JSON (summary)
  provenance jsonb,                 -- in-toto statement
  capabilities jsonb NOT NULL,      -- { net:false, fs:false, crypto:true, env:["FOO"] }
  risk text NOT NULL DEFAULT 'unknown',
  approved boolean NOT NULL DEFAULT false,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(name, version)
);

CREATE TABLE IF NOT EXISTS plugin_vulns (
  id bigserial PRIMARY KEY,
  plugin_id uuid REFERENCES plugin_registry(id) ON DELETE CASCADE,
  cve text NOT NULL,
  severity text NOT NULL,
  pkg text, version text, fix_version text,
  source text, discovered_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS step_cache (
  key text PRIMARY KEY,             -- sha256 over pluginDigest + inputs digests + params
  artifact_digests text[] NOT NULL,
  created_at timestamptz DEFAULT now()
);