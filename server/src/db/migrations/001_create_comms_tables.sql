-- Migration for Internal Comms

CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  tier VARCHAR(50) NOT NULL,
  audience VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  author_id VARCHAR(255) NOT NULL,
  approver_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  version INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS comms_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tier VARCHAR(50) NOT NULL,
  content_template TEXT NOT NULL,
  audience VARCHAR(50) NOT NULL
);
