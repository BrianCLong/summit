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
