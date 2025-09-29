-- Migration: Add deterministic export manifests table
-- Date: 2025-08-20
-- Purpose: Support GA Core export provenance and integrity verification

CREATE TABLE IF NOT EXISTS export_manifests (
  id UUID PRIMARY KEY,
  
  -- Manifest metadata
  version VARCHAR(10) NOT NULL DEFAULT '1.0',
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Export request parameters
  request_params JSONB NOT NULL,
  
  -- File inventory
  files_count INTEGER NOT NULL DEFAULT 0,
  total_bytes BIGINT NOT NULL DEFAULT 0,
  file_list JSONB DEFAULT '[]',
  
  -- Integrity hashes
  manifest_hash VARCHAR(64) NOT NULL,
  bundle_hash VARCHAR(64),
  
  -- Transform provenance
  transforms JSONB DEFAULT '[]',
  
  -- Verification status
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_errors JSONB DEFAULT '[]',
  
  -- Export status
  status VARCHAR(20) DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'READY', 'DOWNLOADED', 'EXPIRED', 'FAILED')),
  download_count INTEGER DEFAULT 0,
  last_downloaded TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- File system reference
  bundle_path TEXT,
  bundle_size BIGINT,
  
  -- Performance indexes
  INDEX idx_export_manifests_created (created_by, created_at),
  INDEX idx_export_manifests_status (status),
  INDEX idx_export_manifests_verified (verified),
  INDEX idx_export_manifests_expires (expires_at)
);

-- Create table for export integrity metrics (for Go/No-Go dashboard)
CREATE TABLE IF NOT EXISTS export_integrity_metrics (
  id SERIAL PRIMARY KEY,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Volume metrics
  total_exports INTEGER NOT NULL DEFAULT 0,
  bundle_exports INTEGER NOT NULL DEFAULT 0,
  verified_exports INTEGER NOT NULL DEFAULT 0,
  failed_exports INTEGER NOT NULL DEFAULT 0,
  
  -- Integrity metrics
  manifest_integrity_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0,
  bundle_integrity_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0,
  verification_success_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0,
  
  -- Size and performance
  avg_bundle_size_mb DECIMAL(10,2) DEFAULT 0.0,
  avg_export_time_ms INTEGER DEFAULT 0,
  avg_files_per_export DECIMAL(8,2) DEFAULT 0.0,
  
  -- Transform tracking
  redaction_transform_rate DECIMAL(5,4) DEFAULT 0.0,
  filtering_transform_rate DECIMAL(5,4) DEFAULT 0.0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(measurement_date)
);

-- Create view for real-time export metrics
CREATE OR REPLACE VIEW export_metrics_realtime AS
SELECT 
  DATE_TRUNC('day', created_at) as export_date,
  COUNT(*) as total_exports,
  COUNT(CASE WHEN bundle_hash IS NOT NULL THEN 1 END) as bundle_exports,
  COUNT(CASE WHEN verified = true THEN 1 END) as verified_exports,
  COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_exports,
  
  -- Calculate integrity rates
  COALESCE(
    COUNT(CASE WHEN verified = true THEN 1 END)::DECIMAL / 
    NULLIF(COUNT(CASE WHEN bundle_hash IS NOT NULL THEN 1 END), 0),
    0
  ) as bundle_integrity_rate,
  
  COALESCE(
    COUNT(CASE WHEN manifest_hash IS NOT NULL THEN 1 END)::DECIMAL / 
    NULLIF(COUNT(*), 0),
    0
  ) as manifest_integrity_rate,
  
  -- Size and performance metrics
  AVG(bundle_size / 1048576.0) as avg_bundle_size_mb,
  AVG(files_count) as avg_files_per_export,
  AVG(total_bytes / 1048576.0) as avg_data_size_mb,
  
  -- Transform analysis
  COUNT(CASE WHEN transforms::text LIKE '%REDACTION%' THEN 1 END)::DECIMAL / 
  NULLIF(COUNT(*), 0) as redaction_transform_rate,
  
  COUNT(CASE WHEN transforms::text LIKE '%FILTERING%' THEN 1 END)::DECIMAL / 
  NULLIF(COUNT(*), 0) as filtering_transform_rate,
  
  MAX(created_at) as last_export
FROM export_manifests
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY export_date DESC;

-- Function to calculate GA Core export metrics
CREATE OR REPLACE FUNCTION get_ga_export_metrics(
  p_days_back INTEGER DEFAULT 7
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  total_exports INTEGER;
  manifests_with_integrity INTEGER;
  verified_bundles INTEGER;
  integrity_rate DECIMAL(5,4);
BEGIN
  -- Get export counts and integrity metrics
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN manifest_hash IS NOT NULL AND manifest_hash != '' THEN 1 END),
    COUNT(CASE WHEN verified = true THEN 1 END)
  INTO total_exports, manifests_with_integrity, verified_bundles
  FROM export_manifests 
  WHERE created_at >= NOW() - (p_days_back || ' days')::INTERVAL;
  
  -- Calculate integrity rate (% of exports with valid manifests)
  integrity_rate := CASE 
    WHEN total_exports > 0 THEN 
      manifests_with_integrity::DECIMAL / total_exports
    ELSE 0
  END;
  
  -- Build result JSON
  result := jsonb_build_object(
    'total_exports', total_exports,
    'manifests_with_integrity', manifests_with_integrity,
    'verified_bundles', verified_bundles,
    'integrity_rate', integrity_rate,
    'ga_threshold', 0.95, -- GA Core requires 95% manifest integrity
    'meets_threshold', integrity_rate >= 0.95,
    'days_evaluated', p_days_back,
    'evaluated_at', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to update daily export metrics (called by cron/scheduler)
CREATE OR REPLACE FUNCTION update_export_metrics_daily() 
RETURNS VOID AS $$
BEGIN
  INSERT INTO export_integrity_metrics (
    measurement_date,
    total_exports,
    bundle_exports,
    verified_exports,
    failed_exports,
    manifest_integrity_rate,
    bundle_integrity_rate,
    verification_success_rate,
    avg_bundle_size_mb,
    avg_files_per_export,
    redaction_transform_rate,
    filtering_transform_rate
  )
  SELECT 
    CURRENT_DATE,
    total_exports,
    bundle_exports,
    verified_exports,
    failed_exports,
    manifest_integrity_rate,
    bundle_integrity_rate,
    COALESCE(verified_exports::DECIMAL / NULLIF(bundle_exports, 0), 0) as verification_success_rate,
    avg_bundle_size_mb,
    avg_files_per_export,
    redaction_transform_rate,
    filtering_transform_rate
  FROM export_metrics_realtime
  WHERE export_date = CURRENT_DATE
  ON CONFLICT (measurement_date) DO UPDATE SET
    total_exports = EXCLUDED.total_exports,
    bundle_exports = EXCLUDED.bundle_exports,
    verified_exports = EXCLUDED.verified_exports,
    failed_exports = EXCLUDED.failed_exports,
    manifest_integrity_rate = EXCLUDED.manifest_integrity_rate,
    bundle_integrity_rate = EXCLUDED.bundle_integrity_rate,
    verification_success_rate = EXCLUDED.verification_success_rate,
    avg_bundle_size_mb = EXCLUDED.avg_bundle_size_mb,
    avg_files_per_export = EXCLUDED.avg_files_per_export,
    redaction_transform_rate = EXCLUDED.redaction_transform_rate,
    filtering_transform_rate = EXCLUDED.filtering_transform_rate;
END;
$$ LANGUAGE plpgsql;

-- Create table for export download audit trail
CREATE TABLE IF NOT EXISTS export_download_logs (
  id SERIAL PRIMARY KEY,
  export_id UUID NOT NULL REFERENCES export_manifests(id),
  
  -- Download details
  downloaded_by VARCHAR(255) NOT NULL,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  download_method VARCHAR(50) DEFAULT 'web_ui', -- 'web_ui', 'api', 'cli'
  
  -- Verification on download
  integrity_verified BOOLEAN DEFAULT FALSE,
  verification_result JSONB,
  
  -- Access context
  ip_address INET,
  user_agent TEXT,
  
  INDEX idx_export_downloads_export (export_id),
  INDEX idx_export_downloads_user (downloaded_by, downloaded_at),
  INDEX idx_export_downloads_verified (integrity_verified)
);

-- Insert initial baseline data
INSERT INTO export_integrity_metrics (
  measurement_date,
  total_exports,
  manifest_integrity_rate,
  bundle_integrity_rate,
  verification_success_rate
) VALUES (
  CURRENT_DATE - INTERVAL '1 day',
  0,
  1.0, -- Start with perfect integrity for baseline
  1.0,
  1.0
) ON CONFLICT (measurement_date) DO NOTHING;

-- Add comments
COMMENT ON TABLE export_manifests IS 'GA Core: Deterministic export manifests with SHA256 integrity verification';
COMMENT ON TABLE export_integrity_metrics IS 'GA Core: Daily export integrity metrics for Go/No-Go dashboard';
COMMENT ON VIEW export_metrics_realtime IS 'GA Core: Real-time export metrics calculation';
COMMENT ON FUNCTION get_ga_export_metrics IS 'GA Core: Export integrity metrics for GA gate evaluation';
COMMENT ON TABLE export_download_logs IS 'GA Core: Complete audit trail for export downloads';