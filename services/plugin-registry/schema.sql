-- Plugin registry database schema

CREATE TABLE IF NOT EXISTS plugins (
  id VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  version VARCHAR(50) NOT NULL,
  description TEXT,
  author JSONB NOT NULL,
  category VARCHAR(50) NOT NULL,
  manifest JSONB NOT NULL,
  package_url TEXT NOT NULL,
  stats JSONB DEFAULT '{
    "downloads": 0,
    "activeInstalls": 0,
    "rating": 0,
    "reviews": 0,
    "errorCount": 0,
    "successCount": 0
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id, version)
);

CREATE INDEX idx_plugins_id ON plugins(id);
CREATE INDEX idx_plugins_category ON plugins(category);
CREATE INDEX idx_plugins_author ON plugins((author->>'name'));
CREATE INDEX idx_plugins_created_at ON plugins(created_at DESC);

-- Plugin installations table
CREATE TABLE IF NOT EXISTS plugin_installations (
  id SERIAL PRIMARY KEY,
  plugin_id VARCHAR(100) NOT NULL,
  plugin_version VARCHAR(50) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  enabled BOOLEAN DEFAULT true,
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (plugin_id, plugin_version) REFERENCES plugins(id, version)
);

CREATE INDEX idx_installations_tenant ON plugin_installations(tenant_id);
CREATE INDEX idx_installations_plugin ON plugin_installations(plugin_id);

-- Plugin reviews table
CREATE TABLE IF NOT EXISTS plugin_reviews (
  id SERIAL PRIMARY KEY,
  plugin_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plugin_id, user_id)
);

CREATE INDEX idx_reviews_plugin ON plugin_reviews(plugin_id);
CREATE INDEX idx_reviews_rating ON plugin_reviews(rating);
