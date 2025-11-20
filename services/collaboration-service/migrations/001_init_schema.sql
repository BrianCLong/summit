-- Initial schema for collaboration platform
-- PostgreSQL with TimescaleDB extension

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE;

-- ========== Workspaces ==========

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL,
    organization_id UUID,
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    archived_at TIMESTAMP
);

CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_workspaces_slug ON workspaces(slug);
CREATE INDEX idx_workspaces_created_at ON workspaces(created_at DESC);

-- ========== Workspace Members ==========

CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer', 'guest')),
    permissions TEXT[] DEFAULT '{}',
    custom_permissions JSONB DEFAULT '{}',
    joined_at TIMESTAMP DEFAULT NOW(),
    invited_by UUID,
    last_active_at TIMESTAMP,
    UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_role ON workspace_members(role);

-- ========== Projects ==========

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(20),
    icon VARCHAR(50),
    owner_id UUID NOT NULL,
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    archived_at TIMESTAMP,
    UNIQUE(workspace_id, slug)
);

CREATE INDEX idx_projects_workspace ON projects(workspace_id);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- ========== Project Members ==========

CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL,
    permissions TEXT[] DEFAULT '{}',
    added_at TIMESTAMP DEFAULT NOW(),
    added_by UUID NOT NULL,
    UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);

-- ========== Documents (Knowledge Base) ==========

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('wiki', 'article', 'guide', 'reference', 'template', 'note')),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL,
    content TEXT,
    excerpt TEXT,
    author_id UUID NOT NULL,
    collaborators UUID[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP,
    parent_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    "order" INTEGER DEFAULT 0,
    table_of_contents JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_documents_workspace ON documents(workspace_id);
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_documents_author ON documents(author_id);
CREATE INDEX idx_documents_published ON documents(is_published, published_at DESC);
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);

-- Full-text search on documents
CREATE INDEX idx_documents_search ON documents USING GIN(to_tsvector('english', title || ' ' || COALESCE(content, '')));

-- ========== Comment Threads ==========

CREATE TABLE comment_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID NOT NULL,
    anchor_type VARCHAR(50) NOT NULL CHECK (anchor_type IN ('text', 'element', 'coordinate', 'global')),
    anchor JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'archived')),
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    resolved_by UUID,
    resolved_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_comment_threads_workspace ON comment_threads(workspace_id);
CREATE INDEX idx_comment_threads_resource ON comment_threads(resource_type, resource_id);
CREATE INDEX idx_comment_threads_status ON comment_threads(status);
CREATE INDEX idx_comment_threads_created_at ON comment_threads(created_at DESC);

-- ========== Comments ==========

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES comment_threads(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    content JSONB NOT NULL,
    plain_text TEXT,
    attachments JSONB DEFAULT '[]',
    mentions UUID[] DEFAULT '{}',
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    parent_comment_id UUID REFERENCES comments(id) ON DELETE SET NULL
);

CREATE INDEX idx_comments_thread ON comments(thread_id);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX idx_comments_mentions ON comments USING GIN(mentions);

-- Full-text search on comments
CREATE INDEX idx_comments_search ON comments USING GIN(to_tsvector('english', COALESCE(plain_text, '')));

-- ========== Comment Reactions ==========

CREATE TABLE comment_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('like', 'love', 'celebrate', 'insightful', 'curious', 'disagree')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(comment_id, user_id, type)
);

CREATE INDEX idx_comment_reactions_comment ON comment_reactions(comment_id);

-- ========== Comment Votes ==========

CREATE TABLE comment_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

CREATE INDEX idx_comment_votes_comment ON comment_votes(comment_id);

-- ========== Annotations ==========

CREATE TABLE annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID NOT NULL,
    layer_id UUID,
    type VARCHAR(50) NOT NULL,
    geometry JSONB NOT NULL,
    style JSONB DEFAULT '{}',
    content TEXT,
    linked_comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_annotations_resource ON annotations(resource_type, resource_id);
CREATE INDEX idx_annotations_layer ON annotations(layer_id);

-- ========== Annotation Layers ==========

CREATE TABLE annotation_layers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_visible BOOLEAN DEFAULT true,
    is_locked BOOLEAN DEFAULT false,
    opacity NUMERIC(3, 2) DEFAULT 1.0,
    "order" INTEGER NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_annotation_layers_resource ON annotation_layers(resource_id);

-- ========== Tasks ==========

CREATE TABLE boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'kanban' CHECK (type IN ('kanban', 'scrum', 'list')),
    columns JSONB NOT NULL DEFAULT '[]',
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_boards_workspace ON boards(workspace_id);
CREATE INDEX idx_boards_project ON boards(project_id);

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'in_review', 'blocked', 'done', 'archived')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assignee_id UUID,
    reporter_id UUID NOT NULL,
    due_date TIMESTAMP,
    start_date TIMESTAMP,
    completed_at TIMESTAMP,
    estimated_hours NUMERIC(8, 2),
    actual_hours NUMERIC(8, 2),
    labels TEXT[] DEFAULT '{}',
    dependencies UUID[] DEFAULT '{}',
    blocked_by UUID[] DEFAULT '{}',
    subtasks UUID[] DEFAULT '{}',
    parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    attachments JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX idx_tasks_board ON tasks(board_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_reporter ON tasks(reporter_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_labels ON tasks USING GIN(labels);

-- ========== Notifications ==========

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    message TEXT,
    action_url TEXT,
    metadata JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_workspace ON notifications(workspace_id);
CREATE INDEX idx_notifications_type ON notifications(type);

-- ========== Activity Feed ==========

CREATE TABLE activity_feed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    actor_id UUID NOT NULL,
    actor_name VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID NOT NULL,
    resource_name VARCHAR(500),
    details TEXT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activity_workspace ON activity_feed(workspace_id);
CREATE INDEX idx_activity_project ON activity_feed(project_id);
CREATE INDEX idx_activity_actor ON activity_feed(actor_id);
CREATE INDEX idx_activity_timestamp ON activity_feed(timestamp DESC);
CREATE INDEX idx_activity_resource ON activity_feed(resource_type, resource_id);

-- Convert to hypertable for time-series data
SELECT create_hypertable('activity_feed', 'timestamp');

-- ========== Share Links ==========

CREATE TABLE share_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(100) UNIQUE NOT NULL,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('view', 'comment', 'edit')),
    password VARCHAR(255),
    expires_at TIMESTAMP,
    max_uses INTEGER,
    uses INTEGER DEFAULT 0,
    allow_anonymous BOOLEAN DEFAULT false,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP
);

CREATE INDEX idx_share_links_token ON share_links(token);
CREATE INDEX idx_share_links_resource ON share_links(resource_type, resource_id);
CREATE INDEX idx_share_links_workspace ON share_links(workspace_id);

-- ========== Marketplace Assets ==========

CREATE TABLE marketplace_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('analysis', 'dashboard', 'template', 'query', 'report', 'workflow')),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL,
    author_id UUID NOT NULL,
    author_name VARCHAR(255),
    category VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    content_url TEXT NOT NULL,
    thumbnail_url TEXT,
    preview_images TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    price NUMERIC(10, 2) DEFAULT 0,
    rating NUMERIC(3, 2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    license TEXT,
    changelog JSONB DEFAULT '[]',
    dependencies TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_marketplace_assets_type ON marketplace_assets(type);
CREATE INDEX idx_marketplace_assets_author ON marketplace_assets(author_id);
CREATE INDEX idx_marketplace_assets_category ON marketplace_assets(category);
CREATE INDEX idx_marketplace_assets_tags ON marketplace_assets USING GIN(tags);
CREATE INDEX idx_marketplace_assets_rating ON marketplace_assets(rating DESC);
CREATE INDEX idx_marketplace_assets_downloads ON marketplace_assets(download_count DESC);

-- ========== Marketplace Reviews ==========

CREATE TABLE marketplace_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES marketplace_assets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name VARCHAR(255),
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    helpful INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(asset_id, user_id)
);

CREATE INDEX idx_marketplace_reviews_asset ON marketplace_reviews(asset_id);
CREATE INDEX idx_marketplace_reviews_rating ON marketplace_reviews(rating);

-- ========== Meetings ==========

CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    host_id UUID NOT NULL,
    participants JSONB DEFAULT '[]',
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration INTEGER,
    recording_url TEXT,
    transcript_url TEXT,
    notes_url TEXT,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended', 'cancelled')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_meetings_workspace ON meetings(workspace_id);
CREATE INDEX idx_meetings_host ON meetings(host_id);
CREATE INDEX idx_meetings_scheduled ON meetings(scheduled_at);
CREATE INDEX idx_meetings_status ON meetings(status);

-- ========== Version Control ==========

CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID NOT NULL,
    default_branch VARCHAR(255) DEFAULT 'main',
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    UNIQUE(resource_type, resource_id)
);

CREATE INDEX idx_repositories_workspace ON repositories(workspace_id);
CREATE INDEX idx_repositories_resource ON repositories(resource_type, resource_id);

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    head_commit_id UUID NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    is_protected BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    UNIQUE(repository_id, name)
);

CREATE INDEX idx_branches_repository ON branches(repository_id);

CREATE TABLE commits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    parent_commits UUID[] DEFAULT '{}',
    author_id UUID NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    description TEXT,
    changes JSONB NOT NULL DEFAULT '[]',
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_commits_repository ON commits(repository_id);
CREATE INDEX idx_commits_author ON commits(author_id);
CREATE INDEX idx_commits_timestamp ON commits(timestamp DESC);

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    commit_id UUID NOT NULL REFERENCES commits(id) ON DELETE CASCADE,
    message TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    UNIQUE(repository_id, name)
);

CREATE INDEX idx_tags_repository ON tags(repository_id);
CREATE INDEX idx_tags_commit ON tags(commit_id);

-- ========== Functions and Triggers ==========

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to relevant tables
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comment_threads_updated_at BEFORE UPDATE ON comment_threads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_annotations_updated_at BEFORE UPDATE ON annotations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_assets_updated_at BEFORE UPDATE ON marketplace_assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== Views ==========

-- Active workspaces view
CREATE VIEW active_workspaces AS
SELECT w.*, COUNT(DISTINCT wm.user_id) as member_count
FROM workspaces w
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
WHERE w.archived_at IS NULL
GROUP BY w.id;

-- Task statistics view
CREATE VIEW task_stats AS
SELECT
    board_id,
    status,
    COUNT(*) as count,
    COUNT(CASE WHEN assignee_id IS NOT NULL THEN 1 END) as assigned_count,
    AVG(actual_hours) as avg_hours
FROM tasks
GROUP BY board_id, status;

-- Comment activity view
CREATE VIEW comment_activity AS
SELECT
    ct.workspace_id,
    ct.resource_type,
    ct.resource_id,
    COUNT(DISTINCT ct.id) as thread_count,
    COUNT(c.id) as comment_count,
    COUNT(CASE WHEN ct.status = 'open' THEN 1 END) as open_threads,
    MAX(c.created_at) as latest_activity
FROM comment_threads ct
LEFT JOIN comments c ON ct.id = c.thread_id
GROUP BY ct.workspace_id, ct.resource_type, ct.resource_id;

COMMENT ON SCHEMA public IS 'IntelGraph Collaboration Platform Schema v1.0';
