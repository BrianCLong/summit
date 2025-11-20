/**
 * Data Retention and Archival Policies Engine
 */

import { Pool } from 'pg';
import { RetentionPolicy, DataAsset } from '../types.js';
import { randomUUID } from 'node:crypto';

export class RetentionPolicyManager {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Initialize retention policy tables
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS retention_policies (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          retention_period INTEGER NOT NULL,
          archival_period INTEGER,
          destruction_method VARCHAR(50) NOT NULL,
          legal_basis TEXT NOT NULL,
          applicable_classifications JSONB NOT NULL,
          auto_archive BOOLEAN DEFAULT FALSE,
          auto_destroy BOOLEAN DEFAULT FALSE,
          approval_required BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS data_assets (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          classification VARCHAR(50) NOT NULL,
          owner VARCHAR(255) NOT NULL,
          custodian VARCHAR(255) NOT NULL,
          location TEXT NOT NULL,
          retention_period INTEGER NOT NULL,
          retention_policy VARCHAR(255),
          legal_hold BOOLEAN DEFAULT FALSE,
          pii_categories JSONB DEFAULT '[]',
          encryption_required BOOLEAN DEFAULT TRUE,
          backup_required BOOLEAN DEFAULT TRUE,
          last_reviewed TIMESTAMPTZ,
          next_review TIMESTAMPTZ,
          tags JSONB DEFAULT '[]',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS legal_holds (
          id VARCHAR(255) PRIMARY KEY,
          data_asset_id VARCHAR(255) NOT NULL,
          initiated_by VARCHAR(255) NOT NULL,
          initiated_at TIMESTAMPTZ NOT NULL,
          reason TEXT NOT NULL,
          case_number VARCHAR(255),
          release_date TIMESTAMPTZ,
          released_by VARCHAR(255),
          status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'released')),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          FOREIGN KEY (data_asset_id) REFERENCES data_assets(id)
        );

        CREATE INDEX IF NOT EXISTS idx_legal_holds_status ON legal_holds(status);
        CREATE INDEX IF NOT EXISTS idx_data_assets_classification ON data_assets(classification);
      `);
    } finally {
      client.release();
    }
  }

  /**
   * Create retention policy
   */
  async createPolicy(policy: Omit<RetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<RetentionPolicy> {
    const id = randomUUID();
    const now = new Date();

    await this.pool.query(
      `INSERT INTO retention_policies
       (id, name, description, retention_period, archival_period, destruction_method,
        legal_basis, applicable_classifications, auto_archive, auto_destroy, approval_required)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        policy.name,
        policy.description,
        policy.retentionPeriod,
        policy.archivalPeriod,
        policy.destructionMethod,
        policy.legalBasis,
        JSON.stringify(policy.applicableClassifications),
        policy.autoArchive,
        policy.autoDestroy,
        policy.approvalRequired,
      ]
    );

    return {
      ...policy,
      id,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Apply retention policy and archive/delete data
   */
  async applyRetentionPolicies(): Promise<{
    archived: number;
    deleted: number;
    errors: string[];
  }> {
    const client = await this.pool.connect();
    let archived = 0;
    let deleted = 0;
    const errors: string[] = [];

    try {
      await client.query('BEGIN');

      // Get active retention policies
      const policiesResult = await client.query(
        'SELECT * FROM retention_policies WHERE auto_archive = TRUE OR auto_destroy = TRUE'
      );

      for (const policyRow of policiesResult.rows) {
        const retentionDate = new Date();
        retentionDate.setDate(retentionDate.getDate() - policyRow.retention_period);

        const archiveDate = policyRow.archival_period
          ? new Date(Date.now() - policyRow.archival_period * 24 * 60 * 60 * 1000)
          : null;

        // Archive eligible data
        if (policyRow.auto_archive && archiveDate) {
          try {
            const archiveResult = await client.query(
              `SELECT id FROM data_assets
               WHERE retention_policy = $1
               AND legal_hold = FALSE
               AND created_at < $2
               AND created_at >= $3`,
              [policyRow.id, archiveDate, retentionDate]
            );

            archived += archiveResult.rowCount || 0;
          } catch (error) {
            errors.push(`Archive error for policy ${policyRow.id}: ${error}`);
          }
        }

        // Delete data past retention
        if (policyRow.auto_destroy) {
          try {
            const deleteResult = await client.query(
              `DELETE FROM data_assets
               WHERE retention_policy = $1
               AND legal_hold = FALSE
               AND created_at < $2`,
              [policyRow.id, retentionDate]
            );

            deleted += deleteResult.rowCount || 0;
          } catch (error) {
            errors.push(`Deletion error for policy ${policyRow.id}: ${error}`);
          }
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      errors.push(`Transaction error: ${error}`);
    } finally {
      client.release();
    }

    return { archived, deleted, errors };
  }
}
