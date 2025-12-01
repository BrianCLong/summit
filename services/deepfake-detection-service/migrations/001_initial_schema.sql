-- Deepfake Detection System - Initial Schema
-- Migration: 001
-- Created: 2025-11-27

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Detection results metadata
CREATE TABLE IF NOT EXISTS deepfake_detections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_id UUID NOT NULL,
  media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('VIDEO', 'AUDIO', 'IMAGE')),
  media_url TEXT NOT NULL,

  -- Detection results
  is_synthetic BOOLEAN NOT NULL,
  confidence_score DECIMAL(5,4) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  detector_type VARCHAR(50) NOT NULL,
  model_version VARCHAR(50) NOT NULL,

  -- Detailed results
  frame_scores JSONB,
  segment_scores JSONB,
  features JSONB,
  explanation JSONB,

  -- Metadata
  processing_time_ms INTEGER NOT NULL,
  processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  investigation_id UUID,
  entity_id UUID,

  -- Audit
  created_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_detections_media_id ON deepfake_detections(media_id);
CREATE INDEX idx_detections_confidence ON deepfake_detections(confidence_score DESC);
CREATE INDEX idx_detections_investigation ON deepfake_detections(investigation_id) WHERE investigation_id IS NOT NULL;
CREATE INDEX idx_detections_processed_at ON deepfake_detections(processed_at DESC);
CREATE INDEX idx_detections_media_type ON deepfake_detections(media_type);
CREATE INDEX idx_detections_is_synthetic ON deepfake_detections(is_synthetic);

-- Ensemble results
CREATE TABLE IF NOT EXISTS deepfake_ensemble_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_id UUID NOT NULL UNIQUE,

  -- Aggregate scores
  final_confidence DECIMAL(5,4) NOT NULL CHECK (final_confidence >= 0 AND final_confidence <= 1),
  is_synthetic BOOLEAN NOT NULL,

  -- Component scores
  video_confidence DECIMAL(5,4) CHECK (video_confidence IS NULL OR (video_confidence >= 0 AND video_confidence <= 1)),
  audio_confidence DECIMAL(5,4) CHECK (audio_confidence IS NULL OR (audio_confidence >= 0 AND audio_confidence <= 1)),
  image_confidence DECIMAL(5,4) CHECK (image_confidence IS NULL OR (image_confidence >= 0 AND image_confidence <= 1)),

  -- Voting results
  detection_ids UUID[] NOT NULL,
  voting_method VARCHAR(50) NOT NULL DEFAULT 'WEIGHTED_AVERAGE',
  weights JSONB,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ensemble_media_id ON deepfake_ensemble_results(media_id);
CREATE INDEX idx_ensemble_confidence ON deepfake_ensemble_results(final_confidence DESC);

-- ML Models registry
CREATE TABLE IF NOT EXISTS ml_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  version VARCHAR(50) NOT NULL,
  model_type VARCHAR(50) NOT NULL,
  framework VARCHAR(50) NOT NULL DEFAULT 'PYTORCH',

  -- Storage
  storage_url TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  checksum_sha256 VARCHAR(64) NOT NULL,

  -- Training metadata
  training_dataset VARCHAR(200),
  training_date DATE,
  training_metrics JSONB,
  hyperparameters JSONB,

  -- Deployment
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'TESTING', 'STAGING', 'PRODUCTION', 'DEPRECATED', 'ARCHIVED')),
  deployed_at TIMESTAMP,
  deprecated_at TIMESTAMP,
  deployed_by UUID,

  -- Performance tracking
  inference_count BIGINT DEFAULT 0,
  avg_inference_time_ms DECIMAL(10,2),

  -- Metadata
  description TEXT,
  tags TEXT[],
  created_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(name, version)
);

CREATE INDEX idx_models_status ON ml_models(status);
CREATE INDEX idx_models_type ON ml_models(model_type);
CREATE INDEX idx_models_name_version ON ml_models(name, version);

-- Model performance metrics
CREATE TABLE IF NOT EXISTS model_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES ml_models(id) ON DELETE CASCADE,

  -- Time window
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  window_start TIMESTAMP NOT NULL,
  window_end TIMESTAMP NOT NULL,

  -- Performance metrics
  total_inferences INTEGER NOT NULL,
  avg_confidence DECIMAL(5,4),
  false_positive_rate DECIMAL(5,4),
  false_negative_rate DECIMAL(5,4),

  -- Latency metrics
  avg_latency_ms DECIMAL(10,2),
  p50_latency_ms DECIMAL(10,2),
  p95_latency_ms DECIMAL(10,2),
  p99_latency_ms DECIMAL(10,2),

  -- Drift indicators
  feature_drift_score DECIMAL(5,4),
  prediction_drift_score DECIMAL(5,4),

  -- Resource usage
  avg_cpu_usage DECIMAL(5,2),
  avg_memory_usage DECIMAL(5,2),
  avg_gpu_usage DECIMAL(5,2),

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_perf_model_id ON model_performance_metrics(model_id);
CREATE INDEX idx_perf_recorded_at ON model_performance_metrics(recorded_at DESC);
CREATE INDEX idx_perf_drift ON model_performance_metrics(feature_drift_score DESC NULLS LAST);

-- Alerts
CREATE TABLE IF NOT EXISTS deepfake_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  detection_id UUID NOT NULL REFERENCES deepfake_detections(id) ON DELETE CASCADE,

  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'FALSE_POSITIVE', 'DISMISSED')),

  message TEXT NOT NULL,
  context JSONB,

  -- Assignment
  assigned_to UUID,
  assigned_at TIMESTAMP,

  -- Resolution
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  resolved_by UUID,

  -- Notifications
  notified_channels JSONB,
  notification_sent_at TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_status ON deepfake_alerts(status);
CREATE INDEX idx_alerts_severity ON deepfake_alerts(severity);
CREATE INDEX idx_alerts_created_at ON deepfake_alerts(created_at DESC);
CREATE INDEX idx_alerts_assigned_to ON deepfake_alerts(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_alerts_detection_id ON deepfake_alerts(detection_id);

-- Alert rules
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,

  -- Conditions
  min_confidence DECIMAL(5,4) NOT NULL CHECK (min_confidence >= 0 AND min_confidence <= 1),
  detector_types TEXT[],
  media_types TEXT[],
  investigation_ids UUID[],

  -- Actions
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  notify_channels JSONB NOT NULL,
  assign_to_user_id UUID,
  auto_acknowledge BOOLEAN DEFAULT FALSE,

  -- Metadata
  enabled BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 5,
  created_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_rules_enabled ON alert_rules(enabled);
CREATE INDEX idx_alert_rules_priority ON alert_rules(priority DESC);

-- Audit log for all operations
CREATE TABLE IF NOT EXISTS deepfake_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,

  user_id UUID,
  ip_address INET,
  user_agent TEXT,

  changes JSONB,
  metadata JSONB,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON deepfake_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user ON deepfake_audit_log(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_created_at ON deepfake_audit_log(created_at DESC);
CREATE INDEX idx_audit_operation ON deepfake_audit_log(operation);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_detections_updated_at BEFORE UPDATE ON deepfake_detections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON ml_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON deepfake_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE ON alert_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE OR REPLACE VIEW v_recent_high_confidence_detections AS
SELECT 
  d.id,
  d.media_id,
  d.media_type,
  d.is_synthetic,
  d.confidence_score,
  d.detector_type,
  d.processed_at,
  a.id AS alert_id,
  a.severity,
  a.status AS alert_status
FROM deepfake_detections d
LEFT JOIN deepfake_alerts a ON d.id = a.detection_id
WHERE d.confidence_score >= 0.7
  AND d.processed_at >= NOW() - INTERVAL '7 days'
ORDER BY d.confidence_score DESC, d.processed_at DESC;

CREATE OR REPLACE VIEW v_model_performance_summary AS
SELECT 
  m.id,
  m.name,
  m.version,
  m.model_type,
  m.status,
  m.inference_count,
  m.avg_inference_time_ms,
  COUNT(DISTINCT pm.id) AS metrics_count,
  AVG(pm.avg_confidence) AS overall_avg_confidence,
  AVG(pm.false_positive_rate) AS overall_fpr,
  AVG(pm.feature_drift_score) AS avg_drift_score,
  MAX(pm.recorded_at) AS last_metrics_update
FROM ml_models m
LEFT JOIN model_performance_metrics pm ON m.id = pm.model_id
GROUP BY m.id, m.name, m.version, m.model_type, m.status, m.inference_count, m.avg_inference_time_ms;

-- Comments
COMMENT ON TABLE deepfake_detections IS 'Individual detection results from ML models';
COMMENT ON TABLE deepfake_ensemble_results IS 'Aggregated results from multiple detectors';
COMMENT ON TABLE ml_models IS 'Registry of ML models with metadata and performance tracking';
COMMENT ON TABLE model_performance_metrics IS 'Time-series performance metrics for model monitoring';
COMMENT ON TABLE deepfake_alerts IS 'Alerts generated for high-confidence detections';
COMMENT ON TABLE alert_rules IS 'Configurable rules for alert generation';
COMMENT ON TABLE deepfake_audit_log IS 'Audit trail for all operations';
