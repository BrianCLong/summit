/**
 * Database Migration Script for Bundle Pipeline Service
 * Creates all required tables for evidence bundles, claim bundles, and briefing packages
 */

import { Pool } from 'pg';
import pino from 'pino';

const logger = pino({
  level: 'info',
  transport: { target: 'pino-pretty', options: { colorize: true } },
});

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'intelgraph',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

const migrations = [
  // Evidence Items table (source data)
  `CREATE TABLE IF NOT EXISTS evidence_items (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    source_uri TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    collected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    collected_by VARCHAR(255) NOT NULL,
    chain_of_custody_hash VARCHAR(64) NOT NULL,
    classification_level VARCHAR(50) NOT NULL,
    sensitivity_markings JSONB DEFAULT '[]',
    license_type VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,

  // Claim Items table (source data)
  `CREATE TABLE IF NOT EXISTS claim_items (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL,
    statement TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    source VARCHAR(50) NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    supporting_evidence_ids JSONB DEFAULT '[]',
    contradicting_evidence_ids JSONB DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    provenance_hash VARCHAR(64) NOT NULL,
    entity_refs JSONB DEFAULT '[]',
    tags JSONB DEFAULT '[]',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,

  // Evidence Bundles table
  `CREATE TABLE IF NOT EXISTS evidence_bundles (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    evidence_items JSONB NOT NULL,
    related_entity_ids JSONB DEFAULT '[]',
    classification_level VARCHAR(50) NOT NULL,
    sensitivity_markings JSONB DEFAULT '[]',
    license_restrictions JSONB DEFAULT '[]',
    legal_holds JSONB DEFAULT '[]',
    warrant_metadata JSONB,
    manifest JSONB NOT NULL,
    provenance_chain_id UUID NOT NULL,
    chain_of_custody_events JSONB DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    approvals JSONB DEFAULT '[]',
    required_approvals INTEGER NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}'
  )`,

  // Claim Bundles table
  `CREATE TABLE IF NOT EXISTS claim_bundles (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    claims JSONB NOT NULL,
    supporting_evidence_bundle_ids JSONB DEFAULT '[]',
    related_entity_ids JSONB DEFAULT '[]',
    overall_confidence DECIMAL(3,2) NOT NULL,
    conflicting_claims_count INTEGER NOT NULL DEFAULT 0,
    assessment_summary TEXT,
    classification_level VARCHAR(50) NOT NULL,
    sensitivity_markings JSONB DEFAULT '[]',
    manifest JSONB NOT NULL,
    provenance_chain_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    approvals JSONB DEFAULT '[]',
    required_approvals INTEGER NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}'
  )`,

  // Briefing Packages table
  `CREATE TABLE IF NOT EXISTS briefing_packages (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    briefing_type VARCHAR(50) NOT NULL,
    evidence_bundle_ids JSONB DEFAULT '[]',
    claim_bundle_ids JSONB DEFAULT '[]',
    additional_sources JSONB DEFAULT '[]',
    executive_summary TEXT,
    narrative_sections JSONB NOT NULL,
    key_findings JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    annexes JSONB DEFAULT '[]',
    slide_decks JSONB,
    visualizations JSONB DEFAULT '[]',
    classification_level VARCHAR(50) NOT NULL,
    sensitivity_markings JSONB DEFAULT '[]',
    redaction_log JSONB DEFAULT '[]',
    manifest JSONB NOT NULL,
    provenance_chain_id UUID NOT NULL,
    citation_index JSONB DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    distribution_list JSONB DEFAULT '[]',
    approvals JSONB DEFAULT '[]',
    required_approvals INTEGER NOT NULL DEFAULT 1,
    four_eyes_required BOOLEAN NOT NULL DEFAULT FALSE,
    delivery_channels JSONB DEFAULT '[]',
    delivery_status JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}'
  )`,

  // Scheduled Briefings table
  `CREATE TABLE IF NOT EXISTS scheduled_briefings (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    briefing_type VARCHAR(50) NOT NULL,
    template_id UUID,
    schedule JSONB NOT NULL,
    delivery_channels JSONB NOT NULL,
    recipients JSONB NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    run_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    last_error TEXT,
    metadata JSONB DEFAULT '{}'
  )`,

  // Briefing Job Executions table
  `CREATE TABLE IF NOT EXISTS briefing_job_executions (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES scheduled_briefings(id),
    success BOOLEAN NOT NULL,
    briefing_id UUID,
    error TEXT,
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER NOT NULL
  )`,

  // Published Bundles table
  `CREATE TABLE IF NOT EXISTS published_bundles (
    id UUID PRIMARY KEY,
    bundle_id UUID NOT NULL,
    bundle_type VARCHAR(50) NOT NULL,
    archive_hash VARCHAR(64) NOT NULL,
    storage_uri TEXT NOT NULL,
    published_by VARCHAR(255) NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    tenant_id VARCHAR(255) NOT NULL
  )`,

  // Indexes for performance
  `CREATE INDEX IF NOT EXISTS idx_evidence_bundles_case_id ON evidence_bundles(case_id)`,
  `CREATE INDEX IF NOT EXISTS idx_evidence_bundles_tenant_id ON evidence_bundles(tenant_id)`,
  `CREATE INDEX IF NOT EXISTS idx_evidence_bundles_status ON evidence_bundles(status)`,
  `CREATE INDEX IF NOT EXISTS idx_evidence_bundles_created_at ON evidence_bundles(created_at DESC)`,

  `CREATE INDEX IF NOT EXISTS idx_claim_bundles_case_id ON claim_bundles(case_id)`,
  `CREATE INDEX IF NOT EXISTS idx_claim_bundles_tenant_id ON claim_bundles(tenant_id)`,
  `CREATE INDEX IF NOT EXISTS idx_claim_bundles_status ON claim_bundles(status)`,

  `CREATE INDEX IF NOT EXISTS idx_briefing_packages_case_id ON briefing_packages(case_id)`,
  `CREATE INDEX IF NOT EXISTS idx_briefing_packages_tenant_id ON briefing_packages(tenant_id)`,
  `CREATE INDEX IF NOT EXISTS idx_briefing_packages_status ON briefing_packages(status)`,
  `CREATE INDEX IF NOT EXISTS idx_briefing_packages_type ON briefing_packages(briefing_type)`,

  `CREATE INDEX IF NOT EXISTS idx_scheduled_briefings_case_id ON scheduled_briefings(case_id)`,
  `CREATE INDEX IF NOT EXISTS idx_scheduled_briefings_status ON scheduled_briefings(status)`,
  `CREATE INDEX IF NOT EXISTS idx_scheduled_briefings_next_run ON scheduled_briefings(next_run_at)`,

  `CREATE INDEX IF NOT EXISTS idx_job_executions_job_id ON briefing_job_executions(job_id)`,
  `CREATE INDEX IF NOT EXISTS idx_job_executions_executed_at ON briefing_job_executions(executed_at DESC)`,

  `CREATE INDEX IF NOT EXISTS idx_published_bundles_bundle_id ON published_bundles(bundle_id)`,
  `CREATE INDEX IF NOT EXISTS idx_published_bundles_tenant ON published_bundles(tenant_id)`,

  `CREATE INDEX IF NOT EXISTS idx_evidence_items_case_id ON evidence_items(case_id)`,
  `CREATE INDEX IF NOT EXISTS idx_claim_items_case_id ON claim_items(case_id)`,
];

async function runMigrations() {
  const pool = new Pool(config);

  logger.info({ config: { ...config, password: '***' } }, 'Starting database migration');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (let i = 0; i < migrations.length; i++) {
      const migration = migrations[i];
      logger.info({ index: i + 1, total: migrations.length }, 'Running migration');
      await client.query(migration);
    }

    await client.query('COMMIT');
    logger.info({ count: migrations.length }, 'All migrations completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Migration failed');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if executed directly
runMigrations()
  .then(() => {
    logger.info('Migration script completed');
    process.exit(0);
  })
  .catch((err) => {
    logger.error({ err }, 'Migration script failed');
    process.exit(1);
  });
