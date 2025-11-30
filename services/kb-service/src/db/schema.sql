-- Knowledge Base Database Schema
-- PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- Enums
-- =============================================================================

CREATE TYPE content_type AS ENUM (
  'article', 'playbook', 'sop', 'runbook', 'faq', 'tutorial', 'reference'
);

CREATE TYPE content_status AS ENUM (
  'draft', 'pending_review', 'approved', 'published', 'archived', 'deprecated'
);

CREATE TYPE classification_level AS ENUM (
  'public', 'internal', 'confidential', 'restricted'
);

CREATE TYPE audience_role AS ENUM (
  'analyst', 'investigator', 'admin', 'engineer', 'manager', 'executive', 'all'
);

CREATE TYPE review_decision AS ENUM (
  'approved', 'rejected', 'needs_revision'
);

-- =============================================================================
-- Core Tables
-- =============================================================================

-- Tags for categorizing content
CREATE TABLE kb_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(500),
  color VARCHAR(7),
  category VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kb_tags_slug ON kb_tags(slug);
CREATE INDEX idx_kb_tags_category ON kb_tags(category);

-- Audience definitions for role-based content access
CREATE TABLE kb_audiences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  roles audience_role[] NOT NULL,
  description VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kb_audiences_roles ON kb_audiences USING GIN(roles);

-- Main articles table
CREATE TABLE kb_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(200) NOT NULL UNIQUE,
  title VARCHAR(300) NOT NULL,
  content_type content_type NOT NULL,
  classification classification_level NOT NULL DEFAULT 'internal',
  effective_date TIMESTAMPTZ,
  expiration_date TIMESTAMPTZ,
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_version_id UUID,
  -- Playbook-specific fields
  estimated_duration INTEGER,
  difficulty VARCHAR(20),
  -- Full-text search
  search_vector TSVECTOR
);

CREATE INDEX idx_kb_articles_slug ON kb_articles(slug);
CREATE INDEX idx_kb_articles_content_type ON kb_articles(content_type);
CREATE INDEX idx_kb_articles_classification ON kb_articles(classification);
CREATE INDEX idx_kb_articles_owner ON kb_articles(owner_id);
CREATE INDEX idx_kb_articles_effective_date ON kb_articles(effective_date);
CREATE INDEX idx_kb_articles_search ON kb_articles USING GIN(search_vector);

-- Article versions for tracking changes
CREATE TABLE kb_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT NOT NULL,
  summary VARCHAR(500),
  change_notes VARCHAR(1000),
  author_id UUID NOT NULL,
  status content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  UNIQUE(article_id, version_number)
);

CREATE INDEX idx_kb_versions_article ON kb_versions(article_id);
CREATE INDEX idx_kb_versions_status ON kb_versions(status);
CREATE INDEX idx_kb_versions_author ON kb_versions(author_id);

-- Add foreign key for current_version_id after versions table exists
ALTER TABLE kb_articles
  ADD CONSTRAINT fk_current_version
  FOREIGN KEY (current_version_id) REFERENCES kb_versions(id);

-- Playbook steps (for playbook content type)
CREATE TABLE kb_playbook_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  title VARCHAR(300) NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT NOT NULL,
  expected_duration INTEGER,
  is_optional BOOLEAN NOT NULL DEFAULT FALSE,
  prerequisites UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(playbook_id, step_number)
);

CREATE INDEX idx_kb_playbook_steps_playbook ON kb_playbook_steps(playbook_id);

-- Review tracking
CREATE TABLE kb_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id UUID NOT NULL REFERENCES kb_versions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  decision review_decision,
  comments VARCHAR(2000),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(version_id, reviewer_id)
);

CREATE INDEX idx_kb_reviews_version ON kb_reviews(version_id);
CREATE INDEX idx_kb_reviews_reviewer ON kb_reviews(reviewer_id);
CREATE INDEX idx_kb_reviews_pending ON kb_reviews(version_id) WHERE decision IS NULL;

-- =============================================================================
-- Junction Tables
-- =============================================================================

-- Article-Tag associations
CREATE TABLE kb_article_tags (
  article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES kb_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

CREATE INDEX idx_kb_article_tags_tag ON kb_article_tags(tag_id);

-- Article-Audience associations
CREATE TABLE kb_article_audiences (
  article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  audience_id UUID NOT NULL REFERENCES kb_audiences(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, audience_id)
);

CREATE INDEX idx_kb_article_audiences_audience ON kb_article_audiences(audience_id);

-- =============================================================================
-- Help Anchors for Contextual Help
-- =============================================================================

CREATE TABLE kb_help_anchors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anchor_key VARCHAR(200) NOT NULL,
  ui_route VARCHAR(500) NOT NULL,
  component_path VARCHAR(500),
  description VARCHAR(500),
  priority INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(anchor_key, ui_route)
);

CREATE INDEX idx_kb_help_anchors_route ON kb_help_anchors(ui_route);
CREATE INDEX idx_kb_help_anchors_key ON kb_help_anchors(anchor_key);

-- Help anchor to article associations
CREATE TABLE kb_help_anchor_articles (
  anchor_id UUID NOT NULL REFERENCES kb_help_anchors(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (anchor_id, article_id)
);

CREATE INDEX idx_kb_help_anchor_articles_article ON kb_help_anchor_articles(article_id);

-- =============================================================================
-- Audit Log
-- =============================================================================

CREATE TABLE kb_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  actor_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kb_audit_log_entity ON kb_audit_log(entity_type, entity_id);
CREATE INDEX idx_kb_audit_log_actor ON kb_audit_log(actor_id);
CREATE INDEX idx_kb_audit_log_timestamp ON kb_audit_log(timestamp);

-- =============================================================================
-- Functions and Triggers
-- =============================================================================

-- Update search vector on article changes
CREATE OR REPLACE FUNCTION kb_update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.slug, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kb_articles_search_update
  BEFORE INSERT OR UPDATE ON kb_articles
  FOR EACH ROW EXECUTE FUNCTION kb_update_search_vector();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION kb_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kb_articles_timestamp
  BEFORE UPDATE ON kb_articles
  FOR EACH ROW EXECUTE FUNCTION kb_update_timestamp();

CREATE TRIGGER kb_tags_timestamp
  BEFORE UPDATE ON kb_tags
  FOR EACH ROW EXECUTE FUNCTION kb_update_timestamp();

CREATE TRIGGER kb_audiences_timestamp
  BEFORE UPDATE ON kb_audiences
  FOR EACH ROW EXECUTE FUNCTION kb_update_timestamp();

CREATE TRIGGER kb_playbook_steps_timestamp
  BEFORE UPDATE ON kb_playbook_steps
  FOR EACH ROW EXECUTE FUNCTION kb_update_timestamp();

CREATE TRIGGER kb_help_anchors_timestamp
  BEFORE UPDATE ON kb_help_anchors
  FOR EACH ROW EXECUTE FUNCTION kb_update_timestamp();

-- =============================================================================
-- Views
-- =============================================================================

-- Published articles with current version content
CREATE OR REPLACE VIEW kb_published_articles AS
SELECT
  a.id,
  a.slug,
  a.title,
  a.content_type,
  a.classification,
  a.effective_date,
  a.expiration_date,
  a.owner_id,
  a.created_at,
  a.updated_at,
  v.id AS version_id,
  v.version_number,
  v.content,
  v.content_html,
  v.summary,
  v.published_at,
  a.estimated_duration,
  a.difficulty
FROM kb_articles a
JOIN kb_versions v ON a.current_version_id = v.id
WHERE v.status = 'published'
  AND (a.effective_date IS NULL OR a.effective_date <= NOW())
  AND (a.expiration_date IS NULL OR a.expiration_date > NOW());

-- Pending reviews
CREATE OR REPLACE VIEW kb_pending_reviews AS
SELECT
  r.id AS review_id,
  r.version_id,
  r.reviewer_id,
  r.requested_at,
  v.article_id,
  a.title AS article_title,
  v.version_number,
  v.author_id,
  v.status
FROM kb_reviews r
JOIN kb_versions v ON r.version_id = v.id
JOIN kb_articles a ON v.article_id = a.id
WHERE r.decision IS NULL
ORDER BY r.requested_at;
