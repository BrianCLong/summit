-- Cyber Threat Intelligence Database Schema

-- Threat Intelligence Table
CREATE TABLE IF NOT EXISTS threat_intelligence (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL,
    type VARCHAR(100) NOT NULL,
    tlp VARCHAR(50) NOT NULL DEFAULT 'AMBER',
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    first_seen TIMESTAMP NOT NULL,
    last_seen TIMESTAMP NOT NULL,
    expires_at TIMESTAMP,
    tenant_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX idx_threat_severity ON threat_intelligence(severity);
CREATE INDEX idx_threat_type ON threat_intelligence(type);
CREATE INDEX idx_threat_tenant ON threat_intelligence(tenant_id);
CREATE INDEX idx_threat_created ON threat_intelligence(created_at);

-- IOCs Table
CREATE TABLE IF NOT EXISTS iocs (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    value VARCHAR(1000) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    severity VARCHAR(50) NOT NULL,
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    first_seen TIMESTAMP NOT NULL,
    last_seen TIMESTAMP NOT NULL,
    expires_at TIMESTAMP,
    description TEXT,
    tlp VARCHAR(50) NOT NULL DEFAULT 'AMBER',
    false_positive_reports INTEGER DEFAULT 0,
    false_positive_reason TEXT,
    tenant_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    enrichment JSONB,
    metadata JSONB
);

CREATE INDEX idx_ioc_type ON iocs(type);
CREATE INDEX idx_ioc_value ON iocs(value);
CREATE INDEX idx_ioc_status ON iocs(status);
CREATE INDEX idx_ioc_severity ON iocs(severity);
CREATE INDEX idx_ioc_tenant ON iocs(tenant_id);

-- IOC Tags (many-to-many)
CREATE TABLE IF NOT EXISTS ioc_tags (
    ioc_id VARCHAR(255) REFERENCES iocs(id) ON DELETE CASCADE,
    tag VARCHAR(255) NOT NULL,
    PRIMARY KEY (ioc_id, tag)
);

CREATE INDEX idx_ioc_tags_tag ON ioc_tags(tag);

-- Threat Feeds Table
CREATE TABLE IF NOT EXISTS threat_feeds (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    source VARCHAR(100) NOT NULL,
    url VARCHAR(2000),
    enabled BOOLEAN DEFAULT true,
    refresh_interval INTEGER NOT NULL,
    last_sync TIMESTAMP,
    total_iocs INTEGER DEFAULT 0,
    api_key VARCHAR(500),
    tlp VARCHAR(50) NOT NULL DEFAULT 'AMBER',
    tenant_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    config JSONB
);

CREATE INDEX idx_feed_enabled ON threat_feeds(enabled);
CREATE INDEX idx_feed_tenant ON threat_feeds(tenant_id);

-- Malware Samples Table
CREATE TABLE IF NOT EXISTS malware_samples (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    md5 VARCHAR(32) NOT NULL,
    sha1 VARCHAR(40) NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    ssdeep VARCHAR(255),
    imphash VARCHAR(255),
    malware_type VARCHAR(100),
    malware_family VARCHAR(255),
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    severity VARCHAR(50) NOT NULL,
    first_seen TIMESTAMP NOT NULL,
    last_seen TIMESTAMP NOT NULL,
    submitted_at TIMESTAMP NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX idx_malware_md5 ON malware_samples(md5);
CREATE INDEX idx_malware_sha256 ON malware_samples(sha256);
CREATE INDEX idx_malware_family ON malware_samples(malware_family);
CREATE INDEX idx_malware_tenant ON malware_samples(tenant_id);

-- Threat Actors Table
CREATE TABLE IF NOT EXISTS threat_actors (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    type VARCHAR(100) NOT NULL,
    sophistication_level VARCHAR(50),
    primary_motivation VARCHAR(100),
    country VARCHAR(100),
    active BOOLEAN DEFAULT true,
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    first_seen TIMESTAMP NOT NULL,
    last_seen TIMESTAMP NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    aliases JSONB,
    metadata JSONB
);

CREATE INDEX idx_actor_type ON threat_actors(type);
CREATE INDEX idx_actor_country ON threat_actors(country);
CREATE INDEX idx_actor_tenant ON threat_actors(tenant_id);

-- Vulnerabilities Table
CREATE TABLE IF NOT EXISTS vulnerabilities (
    id VARCHAR(255) PRIMARY KEY,
    cve_id VARCHAR(50),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL,
    cvss_score DECIMAL(3,1),
    exploit_available VARCHAR(50) DEFAULT 'NOT_AVAILABLE',
    patch_available BOOLEAN DEFAULT false,
    exploited_in_wild BOOLEAN DEFAULT false,
    priority_score INTEGER CHECK (priority_score >= 0 AND priority_score <= 100),
    published_date TIMESTAMP NOT NULL,
    last_modified_date TIMESTAMP NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX idx_vuln_cve ON vulnerabilities(cve_id);
CREATE INDEX idx_vuln_severity ON vulnerabilities(severity);
CREATE INDEX idx_vuln_exploited ON vulnerabilities(exploited_in_wild);
CREATE INDEX idx_vuln_tenant ON vulnerabilities(tenant_id);

-- External Assets Table
CREATE TABLE IF NOT EXISTS external_assets (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    value VARCHAR(1000) NOT NULL,
    status VARCHAR(50) NOT NULL,
    discovered_by VARCHAR(100) NOT NULL,
    discovered_at TIMESTAMP NOT NULL,
    last_seen_at TIMESTAMP NOT NULL,
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    exposure_level VARCHAR(50),
    tenant_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX idx_asset_type ON external_assets(type);
CREATE INDEX idx_asset_status ON external_assets(status);
CREATE INDEX idx_asset_risk ON external_assets(risk_score);
CREATE INDEX idx_asset_tenant ON external_assets(tenant_id);
