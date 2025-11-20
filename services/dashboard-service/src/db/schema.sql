-- Dashboard Service Database Schema
-- PostgreSQL schema for dashboard persistence and management

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Dashboards table
CREATE TABLE IF NOT EXISTS dashboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    layout_config JSONB NOT NULL DEFAULT '{"cols": 12, "rowHeight": 30, "compactType": "vertical", "preventCollision": false}'::jsonb,
    theme JSONB,
    settings JSONB DEFAULT '{"autoRefresh": false, "timezone": "UTC", "dateFormat": "YYYY-MM-DD", "numberFormat": "0,0.00"}'::jsonb,
    metadata JSONB DEFAULT '{"tags": [], "version": 1}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Dashboard widgets table
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('chart', 'metric', 'table', 'map', 'text', 'image', 'iframe', 'custom')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB NOT NULL,
    layout JSONB NOT NULL,
    style JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dashboard filters table
CREATE TABLE IF NOT EXISTS dashboard_filters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    field VARCHAR(255) NOT NULL,
    label VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('select', 'multiselect', 'date', 'daterange', 'text', 'number')),
    options JSONB,
    default_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dashboard sharing and permissions table
CREATE TABLE IF NOT EXISTS dashboard_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID NOT NULL,
    UNIQUE(dashboard_id, user_id)
);

-- Dashboard comments table for collaboration
CREATE TABLE IF NOT EXISTS dashboard_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    widget_id UUID REFERENCES dashboard_widgets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    parent_comment_id UUID REFERENCES dashboard_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Dashboard snapshots for versioning
CREATE TABLE IF NOT EXISTS dashboard_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    snapshot_data JSONB NOT NULL,
    version INTEGER NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT
);

-- Dashboard templates
CREATE TABLE IF NOT EXISTS dashboard_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    preview_image TEXT,
    template_data JSONB NOT NULL,
    is_system BOOLEAN DEFAULT FALSE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dashboard activity log
CREATE TABLE IF NOT EXISTS dashboard_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'viewed', 'shared', 'exported', 'commented')),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dashboards_owner ON dashboards(owner_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_public ON dashboards(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_dashboards_created ON dashboards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboards_updated ON dashboards(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboards_deleted ON dashboards(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_widgets_dashboard ON dashboard_widgets(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_widgets_type ON dashboard_widgets(type);

CREATE INDEX IF NOT EXISTS idx_filters_dashboard ON dashboard_filters(dashboard_id);

CREATE INDEX IF NOT EXISTS idx_permissions_dashboard ON dashboard_permissions(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_permissions_user ON dashboard_permissions(user_id);

CREATE INDEX IF NOT EXISTS idx_comments_dashboard ON dashboard_comments(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_comments_widget ON dashboard_comments(widget_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON dashboard_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON dashboard_comments(parent_comment_id);

CREATE INDEX IF NOT EXISTS idx_snapshots_dashboard ON dashboard_snapshots(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_version ON dashboard_snapshots(dashboard_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_templates_category ON dashboard_templates(category);

CREATE INDEX IF NOT EXISTS idx_activity_dashboard ON dashboard_activity(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON dashboard_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON dashboard_activity(created_at DESC);

-- Full-text search on dashboards
CREATE INDEX IF NOT EXISTS idx_dashboards_search ON dashboards USING gin(
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dashboards_updated_at
    BEFORE UPDATE ON dashboards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_widgets_updated_at
    BEFORE UPDATE ON dashboard_widgets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON dashboard_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON dashboard_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to record dashboard activity
CREATE OR REPLACE FUNCTION record_dashboard_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO dashboard_activity (dashboard_id, user_id, action, details)
        VALUES (NEW.id, NEW.owner_id, 'created', to_jsonb(NEW));
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO dashboard_activity (dashboard_id, user_id, action, details)
        VALUES (NEW.id, NEW.owner_id, 'updated', jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO dashboard_activity (dashboard_id, user_id, action, details)
        VALUES (OLD.id, OLD.owner_id, 'deleted', to_jsonb(OLD));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_dashboard_activity
    AFTER INSERT OR UPDATE OR DELETE ON dashboards
    FOR EACH ROW
    EXECUTE FUNCTION record_dashboard_activity();
