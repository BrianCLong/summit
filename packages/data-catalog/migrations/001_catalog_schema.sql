-- Data Catalog Schema
-- Comprehensive database schema for data catalog metadata

-- Asset Metadata Table
CREATE TABLE IF NOT EXISTS catalog_assets (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(500) NOT NULL,
    display_name VARCHAR(500) NOT NULL,
    description TEXT,
    fully_qualified_name VARCHAR(1000) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    classification VARCHAR(50) NOT NULL DEFAULT 'INTERNAL',

    -- Ownership
    owner VARCHAR(255) NOT NULL,
    stewards JSONB DEFAULT '[]'::jsonb,
    experts JSONB DEFAULT '[]'::jsonb,

    -- Organization
    tags JSONB DEFAULT '[]'::jsonb,
    collections JSONB DEFAULT '[]'::jsonb,
    domain VARCHAR(255),

    -- Technical Metadata
    schema JSONB,
    properties JSONB DEFAULT '{}'::jsonb,
    statistics JSONB,

    -- Quality & Trust
    certification_level VARCHAR(50) DEFAULT 'NONE',
    endorsement_count INTEGER DEFAULT 0,
    user_rating DECIMAL(3,2) DEFAULT 0.0,
    usage_count INTEGER DEFAULT 0,
    last_verified TIMESTAMP,
    verified_by VARCHAR(255),

    -- Quality Scores
    quality_overall DECIMAL(3,2) DEFAULT 0.0,
    quality_completeness DECIMAL(3,2) DEFAULT 0.0,
    quality_accuracy DECIMAL(3,2) DEFAULT 0.0,
    quality_consistency DECIMAL(3,2) DEFAULT 0.0,
    quality_timeliness DECIMAL(3,2) DEFAULT 0.0,
    quality_validity DECIMAL(3,2) DEFAULT 0.0,
    quality_uniqueness DECIMAL(3,2) DEFAULT 0.0,

    -- Temporal
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP,

    -- Documentation
    documentation TEXT,
    sample_data JSONB,

    -- Indexes for search
    search_vector tsvector
);

-- Create indexes
CREATE INDEX idx_assets_type ON catalog_assets(type);
CREATE INDEX idx_assets_status ON catalog_assets(status);
CREATE INDEX idx_assets_owner ON catalog_assets(owner);
CREATE INDEX idx_assets_domain ON catalog_assets(domain);
CREATE INDEX idx_assets_classification ON catalog_assets(classification);
CREATE INDEX idx_assets_fqn ON catalog_assets(fully_qualified_name);
CREATE INDEX idx_assets_created_at ON catalog_assets(created_at DESC);
CREATE INDEX idx_assets_updated_at ON catalog_assets(updated_at DESC);
CREATE INDEX idx_assets_search ON catalog_assets USING gin(search_vector);
CREATE INDEX idx_assets_tags ON catalog_assets USING gin(tags);

-- Asset Relationships Table
CREATE TABLE IF NOT EXISTS catalog_relationships (
    id VARCHAR(255) PRIMARY KEY,
    from_asset_id VARCHAR(255) NOT NULL REFERENCES catalog_assets(id) ON DELETE CASCADE,
    to_asset_id VARCHAR(255) NOT NULL REFERENCES catalog_assets(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(from_asset_id, to_asset_id, relationship_type)
);

CREATE INDEX idx_relationships_from ON catalog_relationships(from_asset_id);
CREATE INDEX idx_relationships_to ON catalog_relationships(to_asset_id);
CREATE INDEX idx_relationships_type ON catalog_relationships(relationship_type);

-- Glossary Terms Table
CREATE TABLE IF NOT EXISTS glossary_terms (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    display_name VARCHAR(500) NOT NULL,
    definition TEXT NOT NULL,
    long_description TEXT,

    -- Taxonomy
    category_id VARCHAR(255),
    parent_term_id VARCHAR(255) REFERENCES glossary_terms(id),

    -- Relationships
    synonyms JSONB DEFAULT '[]'::jsonb,
    related_terms JSONB DEFAULT '[]'::jsonb,
    acronyms JSONB DEFAULT '[]'::jsonb,
    abbreviations JSONB DEFAULT '[]'::jsonb,

    -- Ownership
    owner VARCHAR(255) NOT NULL,
    stewards JSONB DEFAULT '[]'::jsonb,
    domain VARCHAR(255),
    tags JSONB DEFAULT '[]'::jsonb,

    -- Business Rules
    business_rules JSONB DEFAULT '[]'::jsonb,
    examples JSONB DEFAULT '[]'::jsonb,
    usage_notes TEXT,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    approval_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,

    -- Versioning
    version INTEGER NOT NULL DEFAULT 1,
    version_history JSONB DEFAULT '[]'::jsonb,

    -- Temporal
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    updated_by VARCHAR(255) NOT NULL
);

CREATE INDEX idx_terms_name ON glossary_terms(name);
CREATE INDEX idx_terms_category ON glossary_terms(category_id);
CREATE INDEX idx_terms_status ON glossary_terms(status);
CREATE INDEX idx_terms_approval_status ON glossary_terms(approval_status);

-- Glossary Categories Table
CREATE TABLE IF NOT EXISTS glossary_categories (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    parent_category_id VARCHAR(255) REFERENCES glossary_categories(id),
    term_count INTEGER DEFAULT 0,
    icon VARCHAR(100),
    color VARCHAR(50),
    sort_order INTEGER DEFAULT 0
);

-- Term-Asset Links Table
CREATE TABLE IF NOT EXISTS term_asset_links (
    term_id VARCHAR(255) NOT NULL REFERENCES glossary_terms(id) ON DELETE CASCADE,
    asset_id VARCHAR(255) NOT NULL REFERENCES catalog_assets(id) ON DELETE CASCADE,
    linked_by VARCHAR(255) NOT NULL,
    linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confidence DECIMAL(3,2) DEFAULT 1.0,
    is_auto_linked BOOLEAN DEFAULT false,

    PRIMARY KEY (term_id, asset_id)
);

-- Lineage Nodes Table
CREATE TABLE IF NOT EXISTS lineage_nodes (
    id VARCHAR(255) PRIMARY KEY,
    asset_id VARCHAR(255) NOT NULL REFERENCES catalog_assets(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    type VARCHAR(50) NOT NULL,
    level INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_lineage_nodes_asset ON lineage_nodes(asset_id);

-- Lineage Edges Table
CREATE TABLE IF NOT EXISTS lineage_edges (
    id VARCHAR(255) PRIMARY KEY,
    from_node_id VARCHAR(255) NOT NULL REFERENCES lineage_nodes(id) ON DELETE CASCADE,
    to_node_id VARCHAR(255) NOT NULL REFERENCES lineage_nodes(id) ON DELETE CASCADE,
    transformation_type VARCHAR(50) NOT NULL,
    transformation_logic TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,

    UNIQUE(from_node_id, to_node_id)
);

CREATE INDEX idx_lineage_edges_from ON lineage_edges(from_node_id);
CREATE INDEX idx_lineage_edges_to ON lineage_edges(to_node_id);

-- Usage Events Table
CREATE TABLE IF NOT EXISTS usage_events (
    id VARCHAR(255) PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    asset_id VARCHAR(255) REFERENCES catalog_assets(id) ON DELETE SET NULL,
    user_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usage_events_asset ON usage_events(asset_id);
CREATE INDEX idx_usage_events_user ON usage_events(user_id);
CREATE INDEX idx_usage_events_type ON usage_events(event_type);
CREATE INDEX idx_usage_events_timestamp ON usage_events(timestamp DESC);

-- Comments Table
CREATE TABLE IF NOT EXISTS catalog_comments (
    id VARCHAR(255) PRIMARY KEY,
    asset_id VARCHAR(255) NOT NULL REFERENCES catalog_assets(id) ON DELETE CASCADE,
    parent_id VARCHAR(255) REFERENCES catalog_comments(id),
    thread_id VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    format VARCHAR(50) DEFAULT 'MARKDOWN',
    mentions JSONB DEFAULT '[]'::jsonb,
    reactions JSONB DEFAULT '[]'::jsonb,
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_asset ON catalog_comments(asset_id);
CREATE INDEX idx_comments_thread ON catalog_comments(thread_id);
CREATE INDEX idx_comments_author ON catalog_comments(author);

-- Documents Table
CREATE TABLE IF NOT EXISTS catalog_documents (
    id VARCHAR(255) PRIMARY KEY,
    asset_id VARCHAR(255) NOT NULL REFERENCES catalog_assets(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    format VARCHAR(50) DEFAULT 'MARKDOWN',
    author VARCHAR(255) NOT NULL,
    contributors JSONB DEFAULT '[]'::jsonb,
    last_edited_by VARCHAR(255),
    version INTEGER NOT NULL DEFAULT 1,
    version_history JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    categories JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'DRAFT',
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_asset ON catalog_documents(asset_id);
CREATE INDEX idx_documents_author ON catalog_documents(author);
CREATE INDEX idx_documents_status ON catalog_documents(status);

-- Discovery Jobs Table
CREATE TABLE IF NOT EXISTS discovery_jobs (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    source_id VARCHAR(255) NOT NULL,
    schedule VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    options JSONB DEFAULT '{}'::jsonb,
    last_run TIMESTAMP,
    next_run TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_discovery_jobs_enabled ON discovery_jobs(enabled);
CREATE INDEX idx_discovery_jobs_next_run ON discovery_jobs(next_run);

-- Discovery Job Executions Table
CREATE TABLE IF NOT EXISTS discovery_executions (
    id VARCHAR(255) PRIMARY KEY,
    job_id VARCHAR(255) NOT NULL REFERENCES discovery_jobs(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    assets_discovered INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_executions_job ON discovery_executions(job_id);
CREATE INDEX idx_executions_status ON discovery_executions(status);
CREATE INDEX idx_executions_started ON discovery_executions(started_at DESC);

-- Create trigger to update search vector
CREATE OR REPLACE FUNCTION update_asset_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.display_name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(array_to_string(array(SELECT jsonb_array_elements_text(NEW.tags)), ' '), '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assets_search_vector_update
    BEFORE INSERT OR UPDATE ON catalog_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_asset_search_vector();
