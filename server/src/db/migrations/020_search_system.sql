-- Migration: Search System Tables
-- Description: Create tables for search analytics, saved searches, and query tracking
-- Author: Claude
-- Date: 2025-11-20

-- ============================================================================
-- Search Analytics Tables
-- ============================================================================

-- Main search analytics table for query tracking
CREATE TABLE IF NOT EXISTS search_analytics (
  query_id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255),
  query_text TEXT NOT NULL,
  query_type VARCHAR(50) NOT NULL DEFAULT 'fulltext',
  filters JSONB,
  result_count INTEGER NOT NULL DEFAULT 0,
  execution_time INTEGER NOT NULL, -- milliseconds
  success BOOLEAN NOT NULL DEFAULT true,
  session_id VARCHAR(255),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT check_query_type CHECK (query_type IN ('fulltext', 'semantic', 'hybrid', 'fuzzy')),
  CONSTRAINT check_execution_time CHECK (execution_time >= 0),
  CONSTRAINT check_result_count CHECK (result_count >= 0)
);

-- Indexes for search analytics
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id
  ON search_analytics(user_id);

CREATE INDEX IF NOT EXISTS idx_search_analytics_tenant_id
  ON search_analytics(tenant_id);

CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp
  ON search_analytics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_search_analytics_query_text
  ON search_analytics USING gin(to_tsvector('english', query_text));

CREATE INDEX IF NOT EXISTS idx_search_analytics_session
  ON search_analytics(session_id) WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_search_analytics_success
  ON search_analytics(success, timestamp DESC);

-- Click tracking table
CREATE TABLE IF NOT EXISTS search_clicks (
  id SERIAL PRIMARY KEY,
  query_id VARCHAR(255) NOT NULL,
  result_id VARCHAR(255) NOT NULL,
  result_type VARCHAR(50),
  position INTEGER NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_search_clicks_query
    FOREIGN KEY (query_id)
    REFERENCES search_analytics(query_id)
    ON DELETE CASCADE,
  CONSTRAINT check_position CHECK (position >= 0)
);

CREATE INDEX IF NOT EXISTS idx_search_clicks_query_id
  ON search_clicks(query_id);

CREATE INDEX IF NOT EXISTS idx_search_clicks_result_id
  ON search_clicks(result_id);

CREATE INDEX IF NOT EXISTS idx_search_clicks_timestamp
  ON search_clicks(timestamp DESC);

-- Query refinement tracking
CREATE TABLE IF NOT EXISTS search_refinements (
  id SERIAL PRIMARY KEY,
  query_id VARCHAR(255) NOT NULL,
  original_query TEXT NOT NULL,
  refined_query TEXT NOT NULL,
  refinement_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_search_refinements_query
    FOREIGN KEY (query_id)
    REFERENCES search_analytics(query_id)
    ON DELETE CASCADE,
  CONSTRAINT check_refinement_type
    CHECK (refinement_type IN ('filter', 'spelling', 'suggestion', 'facet', 'expansion'))
);

CREATE INDEX IF NOT EXISTS idx_search_refinements_query_id
  ON search_refinements(query_id);

CREATE INDEX IF NOT EXISTS idx_search_refinements_type
  ON search_refinements(refinement_type);

-- ============================================================================
-- Saved Searches
-- ============================================================================

CREATE TABLE IF NOT EXISTS saved_searches (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  query JSONB NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255),
  is_public BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT check_execution_count CHECK (execution_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id
  ON saved_searches(user_id);

CREATE INDEX IF NOT EXISTS idx_saved_searches_tenant_id
  ON saved_searches(tenant_id);

CREATE INDEX IF NOT EXISTS idx_saved_searches_public
  ON saved_searches(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_saved_searches_tags
  ON saved_searches USING gin(tags);

CREATE INDEX IF NOT EXISTS idx_saved_searches_name
  ON saved_searches USING gin(to_tsvector('english', name));

-- ============================================================================
-- Search Configuration and Synonyms
-- ============================================================================

CREATE TABLE IF NOT EXISTS search_synonyms (
  id SERIAL PRIMARY KEY,
  term VARCHAR(255) NOT NULL,
  synonyms TEXT[] NOT NULL,
  domain VARCHAR(100), -- Optional domain/category
  tenant_id VARCHAR(255), -- Tenant-specific synonyms
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_term_per_tenant UNIQUE (term, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_search_synonyms_term
  ON search_synonyms(term);

CREATE INDEX IF NOT EXISTS idx_search_synonyms_domain
  ON search_synonyms(domain) WHERE domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_search_synonyms_active
  ON search_synonyms(is_active) WHERE is_active = true;

-- ============================================================================
-- Search Query Templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS search_templates (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template TEXT NOT NULL,
  params JSONB DEFAULT '{}'::JSONB,
  user_id VARCHAR(255),
  tenant_id VARCHAR(255),
  is_public BOOLEAN NOT NULL DEFAULT false,
  category VARCHAR(100),
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_templates_category
  ON search_templates(category);

CREATE INDEX IF NOT EXISTS idx_search_templates_public
  ON search_templates(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_search_templates_user
  ON search_templates(user_id) WHERE user_id IS NOT NULL;

-- ============================================================================
-- Zero Result Queries (for improvement tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS search_zero_results (
  id SERIAL PRIMARY KEY,
  query_text TEXT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255),
  filters JSONB,
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  first_seen TIMESTAMP NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolution_note TEXT,

  CONSTRAINT unique_zero_result_query UNIQUE (query_text, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_search_zero_results_unresolved
  ON search_zero_results(resolved, occurrence_count DESC)
  WHERE resolved = false;

CREATE INDEX IF NOT EXISTS idx_search_zero_results_last_seen
  ON search_zero_results(last_seen DESC);

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Trigger to update saved_searches.updated_at
CREATE OR REPLACE FUNCTION update_saved_search_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_saved_search_timestamp
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_search_timestamp();

-- Function to track zero result queries
CREATE OR REPLACE FUNCTION track_zero_result_query(
  p_query_text TEXT,
  p_user_id VARCHAR(255),
  p_tenant_id VARCHAR(255),
  p_filters JSONB
) RETURNS void AS $$
BEGIN
  INSERT INTO search_zero_results (query_text, user_id, tenant_id, filters)
  VALUES (p_query_text, p_user_id, p_tenant_id, p_filters)
  ON CONFLICT (query_text, tenant_id)
  DO UPDATE SET
    occurrence_count = search_zero_results.occurrence_count + 1,
    last_seen = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get popular search queries
CREATE OR REPLACE FUNCTION get_popular_queries(
  p_limit INTEGER DEFAULT 10,
  p_tenant_id VARCHAR(255) DEFAULT NULL,
  p_days INTEGER DEFAULT 30
) RETURNS TABLE (
  query_text TEXT,
  execution_count BIGINT,
  unique_users BIGINT,
  avg_execution_time NUMERIC,
  avg_result_count NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sa.query_text,
    COUNT(*) as execution_count,
    COUNT(DISTINCT sa.user_id) as unique_users,
    AVG(sa.execution_time)::NUMERIC(10,2) as avg_execution_time,
    AVG(sa.result_count)::NUMERIC(10,2) as avg_result_count
  FROM search_analytics sa
  WHERE
    sa.success = true
    AND sa.timestamp > NOW() - (p_days || ' days')::INTERVAL
    AND (p_tenant_id IS NULL OR sa.tenant_id = p_tenant_id)
  GROUP BY sa.query_text
  ORDER BY execution_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Sample Data for Development
-- ============================================================================

-- Insert default synonyms (only in development)
INSERT INTO search_synonyms (term, synonyms, domain, is_active) VALUES
  ('person', ARRAY['individual', 'human', 'people', 'personnel', 'actor'], 'entity_types', true),
  ('organization', ARRAY['company', 'corp', 'enterprise', 'business', 'org', 'firm'], 'entity_types', true),
  ('location', ARRAY['place', 'address', 'geo', 'position', 'site'], 'entity_types', true),
  ('threat', ARRAY['danger', 'risk', 'vulnerability', 'attack', 'exploit'], 'intelligence', true),
  ('intel', ARRAY['intelligence', 'information', 'data', 'insights'], 'intelligence', true)
ON CONFLICT (term, tenant_id) DO NOTHING;

-- Insert default search templates
INSERT INTO search_templates (id, name, description, template, category, is_public) VALUES
  ('threat-intel', 'Threat Intelligence Search', 'Search for threat indicators and vulnerabilities',
   'type:threat AND (malware OR vulnerability) AND date:{{date_range}}', 'security', true),
  ('entity-connections', 'Entity Relationships', 'Find entities connected to a specific entity',
   'entity:"{{entity_id}}" AND related:true', 'analysis', true),
  ('high-confidence', 'High Confidence Results', 'Search for highly confident matches only',
   'confidence:0.8_to_1.0 AND {{query}}', 'quality', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Cleanup and Maintenance
-- ============================================================================

-- Commented out - should be run as scheduled maintenance
-- DELETE FROM search_analytics WHERE timestamp < NOW() - INTERVAL '90 days';
-- DELETE FROM search_clicks WHERE timestamp < NOW() - INTERVAL '90 days';
-- DELETE FROM search_refinements WHERE timestamp < NOW() - INTERVAL '90 days';

COMMENT ON TABLE search_analytics IS 'Tracks all search queries for analytics and optimization';
COMMENT ON TABLE search_clicks IS 'Tracks user clicks on search results for relevance tuning';
COMMENT ON TABLE search_refinements IS 'Tracks query refinements and modifications';
COMMENT ON TABLE saved_searches IS 'User-saved searches for quick access';
COMMENT ON TABLE search_synonyms IS 'Domain-specific synonyms for query expansion';
COMMENT ON TABLE search_templates IS 'Reusable search query templates';
COMMENT ON TABLE search_zero_results IS 'Queries that returned zero results for improvement tracking';
