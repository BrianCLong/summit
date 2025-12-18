
-- Migration: Create DLQ Messages table
-- Date: 2026-01-20

CREATE TABLE IF NOT EXISTS dlq_messages (
    id UUID PRIMARY KEY,
    queue_name VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_dlq_queue_created ON dlq_messages(queue_name, created_at);
