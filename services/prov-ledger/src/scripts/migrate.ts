#!/usr/bin/env tsx
/**
 * Database migration script for Prov-Ledger service
 * Consolidates tables from multiple scattered prov-ledger implementations
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/provenance',
});

const migrations = [
  {
    name: '001_create_claims_table',
    sql: `
      CREATE TABLE IF NOT EXISTS claims (
        id VARCHAR(255) PRIMARY KEY,
        content JSONB NOT NULL,
        hash VARCHAR(64) NOT NULL,
        signature TEXT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        authority_id VARCHAR(255),
        reason_for_access TEXT,
        UNIQUE(hash)
      );

      CREATE INDEX IF NOT EXISTS idx_claims_hash ON claims(hash);
      CREATE INDEX IF NOT EXISTS idx_claims_created_at ON claims(created_at);
      CREATE INDEX IF NOT EXISTS idx_claims_authority ON claims(authority_id);
    `,
  },
  {
    name: '002_create_provenance_chains_table',
    sql: `
      CREATE TABLE IF NOT EXISTS provenance_chains (
        id VARCHAR(255) PRIMARY KEY,
        claim_id VARCHAR(255) NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
        transforms JSONB NOT NULL DEFAULT '[]',
        sources JSONB NOT NULL DEFAULT '[]',
        lineage JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        authority_id VARCHAR(255)
      );

      CREATE INDEX IF NOT EXISTS idx_provenance_claim_id ON provenance_chains(claim_id);
      CREATE INDEX IF NOT EXISTS idx_provenance_created_at ON provenance_chains(created_at);
    `,
  },
  {
    name: '003_create_transform_chain_table',
    sql: `
      CREATE TABLE IF NOT EXISTS transform_chain (
        id VARCHAR(255) PRIMARY KEY,
        source_claim_id VARCHAR(255) REFERENCES claims(id),
        target_claim_id VARCHAR(255) REFERENCES claims(id),
        transform_type VARCHAR(100) NOT NULL,
        transform_config JSONB,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        authority_id VARCHAR(255)
      );

      CREATE INDEX IF NOT EXISTS idx_transform_source ON transform_chain(source_claim_id);
      CREATE INDEX IF NOT EXISTS idx_transform_target ON transform_chain(target_claim_id);
    `,
  },
  {
    name: '004_create_licenses_table',
    sql: `
      CREATE TABLE IF NOT EXISTS licenses (
        id VARCHAR(255) PRIMARY KEY,
        claim_id VARCHAR(255) REFERENCES claims(id),
        license_type VARCHAR(100) NOT NULL,
        license_text TEXT,
        terms JSONB,
        restrictions JSONB,
        attribution_required BOOLEAN DEFAULT FALSE,
        commercial_use_allowed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_licenses_claim_id ON licenses(claim_id);
      CREATE INDEX IF NOT EXISTS idx_licenses_type ON licenses(license_type);
    `,
  },
  {
    name: '005_create_hashes_table',
    sql: `
      CREATE TABLE IF NOT EXISTS hashes (
        id VARCHAR(255) PRIMARY KEY,
        hash_value VARCHAR(64) NOT NULL UNIQUE,
        algorithm VARCHAR(20) DEFAULT 'sha256',
        content_type VARCHAR(100),
        verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        verification_count INTEGER DEFAULT 1
      );

      CREATE INDEX IF NOT EXISTS idx_hashes_value ON hashes(hash_value);
      CREATE INDEX IF NOT EXISTS idx_hashes_verified_at ON hashes(verified_at);
    `,
  },
  {
    name: '006_create_authorities_table',
    sql: `
      CREATE TABLE IF NOT EXISTS authorities (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        authority_type VARCHAR(100) NOT NULL,
        description TEXT,
        contact_info JSONB,
        public_key TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_authorities_type ON authorities(authority_type);
      CREATE INDEX IF NOT EXISTS idx_authorities_created_at ON authorities(created_at);
    `,
  },
  {
    name: '007_create_cases_table',
    sql: `
      CREATE TABLE IF NOT EXISTS cases (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_by VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB
      );

      CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
      CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at);
      CREATE INDEX IF NOT EXISTS idx_cases_created_by ON cases(created_by);
    `,
  },
  {
    name: '008_create_evidence_table',
    sql: `
      CREATE TABLE IF NOT EXISTS evidence (
        id VARCHAR(255) PRIMARY KEY,
        case_id VARCHAR(255) REFERENCES cases(id) ON DELETE CASCADE,
        source_ref VARCHAR(500) NOT NULL,
        checksum VARCHAR(64) NOT NULL,
        checksum_algorithm VARCHAR(20) DEFAULT 'sha256',
        content_type VARCHAR(100),
        file_size BIGINT,
        transform_chain JSONB NOT NULL DEFAULT '[]',
        license_id VARCHAR(255) REFERENCES licenses(id),
        policy_labels JSONB NOT NULL DEFAULT '[]',
        authority_id VARCHAR(255) REFERENCES authorities(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB,
        UNIQUE(checksum)
      );

      CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence(case_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_checksum ON evidence(checksum);
      CREATE INDEX IF NOT EXISTS idx_evidence_source_ref ON evidence(source_ref);
      CREATE INDEX IF NOT EXISTS idx_evidence_created_at ON evidence(created_at);
      CREATE INDEX IF NOT EXISTS idx_evidence_authority ON evidence(authority_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_license ON evidence(license_id);
    `,
  },
  {
    name: '009_add_policy_labels_to_claims',
    sql: `
      ALTER TABLE claims
      ADD COLUMN IF NOT EXISTS policy_labels JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS source_ref VARCHAR(500),
      ADD COLUMN IF NOT EXISTS license_id VARCHAR(255) REFERENCES licenses(id);

      CREATE INDEX IF NOT EXISTS idx_claims_license ON claims(license_id);
    `,
  },
  {
    name: '010_add_case_evidence_relationship',
    sql: `
      CREATE TABLE IF NOT EXISTS case_evidence (
        case_id VARCHAR(255) REFERENCES cases(id) ON DELETE CASCADE,
        evidence_id VARCHAR(255) REFERENCES evidence(id) ON DELETE CASCADE,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        added_by VARCHAR(255),
        PRIMARY KEY (case_id, evidence_id)
      );

      CREATE INDEX IF NOT EXISTS idx_case_evidence_case ON case_evidence(case_id);
      CREATE INDEX IF NOT EXISTS idx_case_evidence_evidence ON case_evidence(evidence_id);
    `,
  },
];

async function runMigrations() {
  console.log('🗃️  Starting Prov-Ledger database migrations...');

  try {
    for (const migration of migrations) {
      console.log(`Running migration: ${migration.name}`);
      await pool.query(migration.sql);
      console.log(`✅ Completed: ${migration.name}`);
    }

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations if this script is called directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations };
