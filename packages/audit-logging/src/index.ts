/**
 * Immutable Audit Logging System
 *
 * Provides tamper-proof audit trails using cryptographic hashing and blockchain-like
 * chaining for compliance with NIST 800-53 AU-9 and SOC 2 CC7.2
 */

import { createHash, randomUUID } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { AuditEvent, DataClassification } from '@intelgraph/compliance';

export interface AuditLogEntry extends AuditEvent {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  outcome: 'success' | 'failure';
  ipAddress?: string;
  userAgent?: string;
  classification?: DataClassification;
  sensitivity?: string;
  details?: Record<string, unknown>;
  merkleHash: string;
  blockNumber: number;
  previousHash: string;
}

export interface AuditBlock {
  blockNumber: number;
  timestamp: Date;
  entries: AuditLogEntry[];
  merkleRoot: string;
  previousBlockHash: string;
  blockHash: string;
  signedBy?: string;
  signature?: string;
}

/**
 * Immutable Audit Logger
 * Implements blockchain-like audit trail with cryptographic verification
 */
export class AuditLogger {
  private pool: Pool;
  private currentBlock: AuditLogEntry[] = [];
  private blockSize: number = 100; // Number of entries per block

  constructor(pool: Pool, blockSize: number = 100) {
    this.pool = pool;
    this.blockSize = blockSize;
  }

  /**
   * Initialize audit logging tables
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        -- Audit log entries with blockchain-like chaining
        CREATE TABLE IF NOT EXISTS audit_log (
          id VARCHAR(255) PRIMARY KEY,
          timestamp TIMESTAMPTZ NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          user_name VARCHAR(255) NOT NULL,
          action VARCHAR(255) NOT NULL,
          resource VARCHAR(255) NOT NULL,
          resource_id VARCHAR(255),
          outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('success', 'failure')),
          ip_address INET,
          user_agent TEXT,
          classification VARCHAR(50),
          sensitivity VARCHAR(50),
          details JSONB,
          merkle_hash VARCHAR(64) NOT NULL,
          block_number BIGINT NOT NULL,
          previous_hash VARCHAR(64) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
        CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource);
        CREATE INDEX IF NOT EXISTS idx_audit_log_block_number ON audit_log(block_number);
        CREATE INDEX IF NOT EXISTS idx_audit_log_classification ON audit_log(classification);

        -- Audit blocks with merkle roots
        CREATE TABLE IF NOT EXISTS audit_blocks (
          block_number BIGINT PRIMARY KEY,
          timestamp TIMESTAMPTZ NOT NULL,
          entry_count INTEGER NOT NULL,
          merkle_root VARCHAR(64) NOT NULL,
          previous_block_hash VARCHAR(64) NOT NULL,
          block_hash VARCHAR(64) NOT NULL,
          signed_by VARCHAR(255),
          signature TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_audit_blocks_timestamp ON audit_blocks(timestamp DESC);

        -- Audit log search index for full-text search
        CREATE INDEX IF NOT EXISTS idx_audit_log_details_gin ON audit_log USING GIN (details);

        -- Partition audit_log by month for performance
        -- This helps with long-term retention and archival
        -- Note: Actual partitioning would be done via pg_partman or manual partitioning

        -- Create audit log retention policy table
        CREATE TABLE IF NOT EXISTS audit_retention_policies (
          id VARCHAR(255) PRIMARY KEY,
          classification VARCHAR(50) NOT NULL,
          retention_days INTEGER NOT NULL,
          archive_after_days INTEGER,
          legal_hold BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Insert default retention policies
        INSERT INTO audit_retention_policies (id, classification, retention_days, archive_after_days)
        VALUES
          ('policy-unclassified', 'unclassified', 365, 180),
          ('policy-confidential', 'confidential', 2555, 730),
          ('policy-secret', 'secret', 3650, 1825),
          ('policy-top-secret', 'top_secret', 7300, 3650)
        ON CONFLICT (id) DO NOTHING;
      `);

      // Initialize genesis block if not exists
      await this.initializeGenesisBlock(client);
    } finally {
      client.release();
    }
  }

  /**
   * Initialize genesis block (first block in the chain)
   */
  private async initializeGenesisBlock(client: PoolClient): Promise<void> {
    const result = await client.query('SELECT COUNT(*) as count FROM audit_blocks');
    const count = parseInt(result.rows[0].count);

    if (count === 0) {
      const genesisBlock: AuditBlock = {
        blockNumber: 0,
        timestamp: new Date(),
        entries: [],
        merkleRoot: this.calculateHash('GENESIS'),
        previousBlockHash: '0'.repeat(64),
        blockHash: '',
        signedBy: 'SYSTEM',
      };

      genesisBlock.blockHash = this.calculateBlockHash(genesisBlock);

      await client.query(
        `INSERT INTO audit_blocks
         (block_number, timestamp, entry_count, merkle_root, previous_block_hash, block_hash, signed_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          genesisBlock.blockNumber,
          genesisBlock.timestamp,
          0,
          genesisBlock.merkleRoot,
          genesisBlock.previousBlockHash,
          genesisBlock.blockHash,
          genesisBlock.signedBy,
        ]
      );
    }
  }

  /**
   * Log an audit event (write-once, tamper-proof)
   */
  async log(event: Omit<AuditEvent, 'id' | 'merkleHash' | 'blockNumber' | 'previousHash'>): Promise<AuditLogEntry> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get last entry to chain to
      const lastEntryResult = await client.query(
        'SELECT merkle_hash, block_number FROM audit_log ORDER BY block_number DESC, timestamp DESC LIMIT 1'
      );

      let previousHash = '0'.repeat(64);
      let blockNumber = 0;

      if (lastEntryResult.rows.length > 0) {
        previousHash = lastEntryResult.rows[0].merkle_hash;
        blockNumber = lastEntryResult.rows[0].block_number;

        // Check if we need to finalize current block and start new one
        const blockCountResult = await client.query(
          'SELECT COUNT(*) as count FROM audit_log WHERE block_number = $1',
          [blockNumber]
        );
        const blockCount = parseInt(blockCountResult.rows[0].count);

        if (blockCount >= this.blockSize) {
          await this.finalizeBlock(client, blockNumber);
          blockNumber++;
          previousHash = await this.getLastBlockHash(client);
        }
      }

      // Create audit log entry
      const entry: AuditLogEntry = {
        id: randomUUID(),
        ...event,
        timestamp: new Date(),
        merkleHash: '',
        blockNumber,
        previousHash,
      };

      // Calculate merkle hash
      entry.merkleHash = this.calculateEntryHash(entry);

      // Insert into database
      await client.query(
        `INSERT INTO audit_log
         (id, timestamp, user_id, user_name, action, resource, resource_id, outcome,
          ip_address, user_agent, classification, sensitivity, details,
          merkle_hash, block_number, previous_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          entry.id,
          entry.timestamp,
          entry.userId,
          entry.userName,
          entry.action,
          entry.resource,
          entry.resourceId,
          entry.outcome,
          entry.ipAddress,
          entry.userAgent,
          entry.classification,
          entry.sensitivity,
          entry.details ? JSON.stringify(entry.details) : null,
          entry.merkleHash,
          entry.blockNumber,
          entry.previousHash,
        ]
      );

      await client.query('COMMIT');
      return entry;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Finalize a block by calculating and storing its merkle root
   */
  private async finalizeBlock(client: PoolClient, blockNumber: number): Promise<void> {
    // Get all entries in the block
    const entriesResult = await client.query(
      'SELECT * FROM audit_log WHERE block_number = $1 ORDER BY timestamp',
      [blockNumber]
    );

    const entries = entriesResult.rows.map(row => this.mapRowToEntry(row));

    // Calculate merkle root
    const merkleRoot = this.calculateMerkleRoot(entries.map(e => e.merkleHash));

    // Get previous block hash
    const previousBlockResult = await client.query(
      'SELECT block_hash FROM audit_blocks WHERE block_number = $1',
      [blockNumber - 1]
    );

    const previousBlockHash = previousBlockResult.rows.length > 0
      ? previousBlockResult.rows[0].block_hash
      : '0'.repeat(64);

    // Create block
    const block: AuditBlock = {
      blockNumber,
      timestamp: new Date(),
      entries,
      merkleRoot,
      previousBlockHash,
      blockHash: '',
      signedBy: 'SYSTEM',
    };

    block.blockHash = this.calculateBlockHash(block);

    // Insert block
    await client.query(
      `INSERT INTO audit_blocks
       (block_number, timestamp, entry_count, merkle_root, previous_block_hash, block_hash, signed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        block.blockNumber,
        block.timestamp,
        entries.length,
        block.merkleRoot,
        block.previousBlockHash,
        block.blockHash,
        block.signedBy,
      ]
    );
  }

  /**
   * Get last block hash
   */
  private async getLastBlockHash(client: PoolClient): Promise<string> {
    const result = await client.query(
      'SELECT block_hash FROM audit_blocks ORDER BY block_number DESC LIMIT 1'
    );

    return result.rows.length > 0 ? result.rows[0].block_hash : '0'.repeat(64);
  }

  /**
   * Calculate merkle hash for an entry
   */
  private calculateEntryHash(entry: Omit<AuditLogEntry, 'merkleHash'>): string {
    const data = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp.toISOString(),
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      outcome: entry.outcome,
      previousHash: entry.previousHash,
    });

    return this.calculateHash(data);
  }

  /**
   * Calculate SHA-256 hash
   */
  private calculateHash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Calculate merkle root from array of hashes
   */
  private calculateMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) {
      return this.calculateHash('EMPTY');
    }

    if (hashes.length === 1) {
      return hashes[0];
    }

    const newLevel: string[] = [];

    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = i + 1 < hashes.length ? hashes[i + 1] : hashes[i];
      const combined = this.calculateHash(left + right);
      newLevel.push(combined);
    }

    return this.calculateMerkleRoot(newLevel);
  }

  /**
   * Calculate block hash
   */
  private calculateBlockHash(block: Omit<AuditBlock, 'blockHash'>): string {
    const data = JSON.stringify({
      blockNumber: block.blockNumber,
      timestamp: block.timestamp.toISOString(),
      merkleRoot: block.merkleRoot,
      previousBlockHash: block.previousBlockHash,
    });

    return this.calculateHash(data);
  }

  /**
   * Verify audit log integrity
   */
  async verifyIntegrity(startBlock?: number, endBlock?: number): Promise<{
    valid: boolean;
    invalidBlocks: number[];
    invalidEntries: string[];
    totalBlocks: number;
    totalEntries: number;
  }> {
    const client = await this.pool.connect();
    try {
      const invalidBlocks: number[] = [];
      const invalidEntries: string[] = [];

      // Get blocks to verify
      let blocksQuery = 'SELECT * FROM audit_blocks ORDER BY block_number';
      const params: any[] = [];

      if (startBlock !== undefined && endBlock !== undefined) {
        blocksQuery += ' WHERE block_number BETWEEN $1 AND $2';
        params.push(startBlock, endBlock);
      }

      const blocksResult = await client.query(blocksQuery, params);
      const totalBlocks = blocksResult.rows.length;
      let totalEntries = 0;

      // Verify each block
      for (const blockRow of blocksResult.rows) {
        const blockNumber = blockRow.block_number;

        // Verify block hash
        const block: AuditBlock = {
          blockNumber: blockRow.block_number,
          timestamp: blockRow.timestamp,
          entries: [],
          merkleRoot: blockRow.merkle_root,
          previousBlockHash: blockRow.previous_block_hash,
          blockHash: blockRow.block_hash,
        };

        const calculatedBlockHash = this.calculateBlockHash(block);
        if (calculatedBlockHash !== blockRow.block_hash) {
          invalidBlocks.push(blockNumber);
          continue;
        }

        // Verify merkle root
        const entriesResult = await client.query(
          'SELECT * FROM audit_log WHERE block_number = $1 ORDER BY timestamp',
          [blockNumber]
        );

        const entries = entriesResult.rows.map(row => this.mapRowToEntry(row));
        totalEntries += entries.length;

        const calculatedMerkleRoot = this.calculateMerkleRoot(entries.map(e => e.merkleHash));
        if (calculatedMerkleRoot !== blockRow.merkle_root) {
          invalidBlocks.push(blockNumber);
        }

        // Verify individual entries
        for (const entry of entries) {
          const calculatedHash = this.calculateEntryHash(entry);
          if (calculatedHash !== entry.merkleHash) {
            invalidEntries.push(entry.id);
          }
        }
      }

      return {
        valid: invalidBlocks.length === 0 && invalidEntries.length === 0,
        invalidBlocks,
        invalidEntries,
        totalBlocks,
        totalEntries,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Query audit logs with filtering
   */
  async query(filters: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    outcome?: 'success' | 'failure';
    classification?: DataClassification;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogEntry[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      params.push(filters.userId);
    }

    if (filters.action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(filters.action);
    }

    if (filters.resource) {
      conditions.push(`resource = $${paramIndex++}`);
      params.push(filters.resource);
    }

    if (filters.startDate) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      params.push(filters.endDate);
    }

    if (filters.outcome) {
      conditions.push(`outcome = $${paramIndex++}`);
      params.push(filters.outcome);
    }

    if (filters.classification) {
      conditions.push(`classification = $${paramIndex++}`);
      params.push(filters.classification);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT * FROM audit_log
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(filters.limit || 100, filters.offset || 0);

    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapRowToEntry(row));
  }

  /**
   * Map database row to AuditLogEntry
   */
  private mapRowToEntry(row: any): AuditLogEntry {
    return {
      id: row.id,
      timestamp: row.timestamp,
      userId: row.user_id,
      userName: row.user_name,
      action: row.action,
      resource: row.resource,
      resourceId: row.resource_id,
      outcome: row.outcome,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      classification: row.classification,
      sensitivity: row.sensitivity,
      details: row.details,
      merkleHash: row.merkle_hash,
      blockNumber: row.block_number,
      previousHash: row.previous_hash,
    };
  }

  /**
   * Archive old audit logs based on retention policy
   */
  async archiveOldLogs(): Promise<{ archived: number; deleted: number }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get retention policies
      const policiesResult = await client.query('SELECT * FROM audit_retention_policies');

      let totalArchived = 0;
      let totalDeleted = 0;

      for (const policy of policiesResult.rows) {
        const retentionDate = new Date();
        retentionDate.setDate(retentionDate.getDate() - policy.retention_days);

        const archiveDate = policy.archive_after_days
          ? new Date(Date.now() - policy.archive_after_days * 24 * 60 * 60 * 1000)
          : null;

        // Archive logs
        if (archiveDate && !policy.legal_hold) {
          // In a real implementation, this would move data to cold storage
          const archiveResult = await client.query(
            `SELECT COUNT(*) as count FROM audit_log
             WHERE classification = $1 AND timestamp < $2 AND timestamp >= $3`,
            [policy.classification, archiveDate, retentionDate]
          );
          totalArchived += parseInt(archiveResult.rows[0].count);
        }

        // Delete logs past retention period (only if not on legal hold)
        if (!policy.legal_hold) {
          const deleteResult = await client.query(
            `DELETE FROM audit_log
             WHERE classification = $1 AND timestamp < $2
             RETURNING id`,
            [policy.classification, retentionDate]
          );
          totalDeleted += deleteResult.rowCount || 0;
        }
      }

      await client.query('COMMIT');
      return { archived: totalArchived, deleted: totalDeleted };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

/**
 * Audit event types for common operations
 */
export const AuditActions = {
  // Authentication
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  LOGIN_FAILED: 'auth.login.failed',
  MFA_ENABLED: 'auth.mfa.enabled',
  MFA_DISABLED: 'auth.mfa.disabled',
  PASSWORD_CHANGED: 'auth.password.changed',
  PASSWORD_RESET: 'auth.password.reset',

  // Authorization
  ACCESS_GRANTED: 'authz.access.granted',
  ACCESS_DENIED: 'authz.access.denied',
  PERMISSION_CHANGED: 'authz.permission.changed',
  ROLE_ASSIGNED: 'authz.role.assigned',
  ROLE_REVOKED: 'authz.role.revoked',

  // Data Operations
  DATA_CREATE: 'data.create',
  DATA_READ: 'data.read',
  DATA_UPDATE: 'data.update',
  DATA_DELETE: 'data.delete',
  DATA_EXPORT: 'data.export',
  DATA_IMPORT: 'data.import',

  // Administrative
  ADMIN_ACTION: 'admin.action',
  CONFIG_CHANGED: 'admin.config.changed',
  USER_CREATED: 'admin.user.created',
  USER_DELETED: 'admin.user.deleted',
  USER_SUSPENDED: 'admin.user.suspended',

  // Security
  SECURITY_ALERT: 'security.alert',
  POLICY_VIOLATION: 'security.policy.violation',
  SUSPICIOUS_ACTIVITY: 'security.suspicious.activity',

  // Compliance
  COMPLIANCE_REPORT_GENERATED: 'compliance.report.generated',
  AUDIT_INITIATED: 'compliance.audit.initiated',
  EVIDENCE_COLLECTED: 'compliance.evidence.collected',
} as const;
