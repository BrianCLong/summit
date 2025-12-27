-- Entity comments with attachments and mentions

CREATE TABLE IF NOT EXISTS maestro.entity_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_label VARCHAR(500),
    author_id VARCHAR(255) NOT NULL,
    content_markdown TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entity_comments_tenant_id ON maestro.entity_comments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_entity_comments_entity_id ON maestro.entity_comments(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_comments_created_at ON maestro.entity_comments(created_at DESC);

CREATE TABLE IF NOT EXISTS maestro.entity_comment_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES maestro.entity_comments(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    content_type TEXT,
    size_bytes INTEGER,
    storage_uri TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entity_comment_attachments_comment_id ON maestro.entity_comment_attachments(comment_id);

CREATE TABLE IF NOT EXISTS maestro.entity_comment_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES maestro.entity_comments(id) ON DELETE CASCADE,
    mentioned_user_id VARCHAR(255) NOT NULL,
    mentioned_username VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, mentioned_user_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_comment_mentions_comment_id ON maestro.entity_comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_entity_comment_mentions_user_id ON maestro.entity_comment_mentions(mentioned_user_id);
