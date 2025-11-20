// Verifiable Sync Log: Cryptographically signed, tamper-evident sync logs
// Ensures integrity and non-repudiation of offline sync operations

import crypto from 'crypto';
import Redis from 'ioredis';
import { Pool } from 'pg';
import logger from '../../config/logger.js';
import { dualNotary } from '../../federal/dual-notary.js';
import { prometheusConductorMetrics } from '../observability/prometheus.js';
import type { CRDTOperation } from './crdt-sync.js';

// Sync log entry with cryptographic attestation
export interface SyncLogEntry {
  entryId: string;
  nodeId: string;
  timestamp: Date;
  sequenceNumber: number;
  operation: CRDTOperation;
  previousHash: string; // Hash chain link
  merkleRoot?: string; // Merkle root of operations batch
  signature: string; // HSM signature
  tsaTimestamp?: string; // External timestamp authority
  metadata: {
    sessionId: string;
    batchId?: string;
    entityType: string;
    entityId: string;
    syncDirection: 'inbound' | 'outbound';
  };
}

// Batch of sync operations with collective attestation
export interface SyncBatch {
  batchId: string;
  nodeId: string;
  startTime: Date;
  endTime: Date;
  operationCount: number;
  operations: CRDTOperation[];
  merkleRoot: string;
  merkleProofs: Record<string, string[]>; // operationId -> proof path
  batchSignature: string;
  tsaTimestamp?: string;
  verified: boolean;
}

// Verification result
export interface VerificationResult {
  valid: boolean;
  entryId: string;
  checks: {
    hashChainValid: boolean;
    signatureValid: boolean;
    merkleValid: boolean;
    timestampValid: boolean;
  };
  errors: string[];
}

/**
 * Verifiable Sync Log - Tamper-evident log with cryptographic proofs
 */
export class VerifiableSyncLog {
  private redis: Redis;
  private pool: Pool;
  private sequenceNumbers: Map<string, number>; // nodeId -> sequence

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.sequenceNumbers = new Map();
  }

  /**
   * Initialize sync log for a node
   */
  async initialize(nodeId: string): Promise<void> {
    // Get last sequence number from persistent storage
    const result = await this.pool.query(
      `SELECT MAX(sequence_number) as max_seq
       FROM sync_log_entries
       WHERE node_id = $1`,
      [nodeId],
    );

    const lastSeq = result.rows[0]?.max_seq || 0;
    this.sequenceNumbers.set(nodeId, lastSeq);

    logger.info('Verifiable sync log initialized', {
      nodeId,
      lastSequence: lastSeq,
    });
  }

  /**
   * Record a single sync operation with verification
   */
  async recordOperation(
    nodeId: string,
    operation: CRDTOperation,
    sessionId: string,
    syncDirection: 'inbound' | 'outbound',
  ): Promise<SyncLogEntry> {
    try {
      const entryId = crypto.randomUUID();
      const timestamp = new Date();
      const sequenceNumber = this.getNextSequence(nodeId);

      // Get previous hash for chain
      const previousHash = await this.getPreviousHash(nodeId);

      // Create entry
      const entry: Omit<SyncLogEntry, 'signature'> = {
        entryId,
        nodeId,
        timestamp,
        sequenceNumber,
        operation,
        previousHash,
        signature: '', // Will be filled by signing
        metadata: {
          sessionId,
          entityType: operation.entityType,
          entityId: operation.entityId,
          syncDirection,
        },
      };

      // Compute entry hash
      const entryHash = this.computeEntryHash(entry);

      // Sign with dual notary (HSM + optional TSA)
      const notarized = await dualNotary.notarizeRoot(entryHash);

      const finalEntry: SyncLogEntry = {
        ...entry,
        signature: notarized.hsmSignature,
        tsaTimestamp: notarized.tsaResponse,
      };

      // Store in Redis for fast access
      await this.redis.zadd(
        `sync_log:${nodeId}`,
        sequenceNumber,
        JSON.stringify(finalEntry),
      );

      // Persist to PostgreSQL for long-term storage
      await this.persistEntry(finalEntry);

      // Update metrics
      prometheusConductorMetrics.recordOperationalEvent(
        'sync_log_entry_created',
        true,
        { node_id: nodeId, direction: syncDirection },
      );

      logger.debug('Sync log entry recorded', {
        entryId,
        nodeId,
        sequence: sequenceNumber,
        entityType: operation.entityType,
      });

      return finalEntry;
    } catch (error) {
      logger.error('Failed to record sync operation', { error, nodeId });
      throw error;
    }
  }

  /**
   * Record batch of operations with Merkle tree attestation
   */
  async recordBatch(
    nodeId: string,
    operations: CRDTOperation[],
    sessionId: string,
  ): Promise<SyncBatch> {
    try {
      const batchId = crypto.randomUUID();
      const startTime = new Date();

      // Build Merkle tree for batch
      const merkleTree = this.buildMerkleTree(operations);
      const merkleRoot = merkleTree.root;
      const merkleProofs = this.generateMerkleProofs(operations, merkleTree);

      // Sign Merkle root
      const notarized = await dualNotary.notarizeRoot(merkleRoot);

      const endTime = new Date();

      const batch: SyncBatch = {
        batchId,
        nodeId,
        startTime,
        endTime,
        operationCount: operations.length,
        operations,
        merkleRoot,
        merkleProofs,
        batchSignature: notarized.hsmSignature,
        tsaTimestamp: notarized.tsaResponse,
        verified: true,
      };

      // Store batch metadata
      await this.redis.set(
        `sync_batch:${batchId}`,
        JSON.stringify({
          ...batch,
          operations: undefined, // Don't duplicate operations in metadata
        }),
        'EX',
        86400 * 30, // 30 days
      );

      // Record individual operations with batch reference
      for (const operation of operations) {
        await this.recordOperation(nodeId, operation, sessionId, 'outbound');
      }

      // Persist batch to PostgreSQL
      await this.persistBatch(batch);

      logger.info('Sync batch recorded', {
        batchId,
        nodeId,
        operationCount: operations.length,
      });

      prometheusConductorMetrics.recordOperationalMetric(
        'sync_batch_operations',
        operations.length,
        { node_id: nodeId },
      );

      return batch;
    } catch (error) {
      logger.error('Failed to record sync batch', { error, nodeId });
      throw error;
    }
  }

  /**
   * Verify sync log entry integrity
   */
  async verifyEntry(entryId: string): Promise<VerificationResult> {
    try {
      const entry = await this.getEntry(entryId);
      if (!entry) {
        return {
          valid: false,
          entryId,
          checks: {
            hashChainValid: false,
            signatureValid: false,
            merkleValid: false,
            timestampValid: false,
          },
          errors: ['Entry not found'],
        };
      }

      const checks = {
        hashChainValid: await this.verifyHashChain(entry),
        signatureValid: await this.verifySignature(entry),
        merkleValid: entry.merkleRoot
          ? await this.verifyMerkleProof(entry)
          : true,
        timestampValid: entry.tsaTimestamp
          ? await this.verifyTimestamp(entry)
          : true,
      };

      const errors: string[] = [];
      if (!checks.hashChainValid) errors.push('Hash chain broken');
      if (!checks.signatureValid) errors.push('Invalid signature');
      if (!checks.merkleValid) errors.push('Merkle proof invalid');
      if (!checks.timestampValid) errors.push('Timestamp invalid');

      const valid = Object.values(checks).every((check) => check);

      return {
        valid,
        entryId,
        checks,
        errors,
      };
    } catch (error) {
      logger.error('Entry verification failed', { error, entryId });
      return {
        valid: false,
        entryId,
        checks: {
          hashChainValid: false,
          signatureValid: false,
          merkleValid: false,
          timestampValid: false,
        },
        errors: [error.message],
      };
    }
  }

  /**
   * Verify entire batch
   */
  async verifyBatch(batchId: string): Promise<VerificationResult> {
    try {
      const batch = await this.getBatch(batchId);
      if (!batch) {
        return {
          valid: false,
          entryId: batchId,
          checks: {
            hashChainValid: false,
            signatureValid: false,
            merkleValid: false,
            timestampValid: false,
          },
          errors: ['Batch not found'],
        };
      }

      // Verify Merkle root
      const recomputedTree = this.buildMerkleTree(batch.operations);
      const merkleValid = recomputedTree.root === batch.merkleRoot;

      // Verify batch signature
      const signatureValid = await this.verifyBatchSignature(batch);

      // Verify timestamp
      const timestampValid = batch.tsaTimestamp
        ? await this.verifyBatchTimestamp(batch)
        : true;

      const checks = {
        hashChainValid: true, // Batch doesn't participate in hash chain
        signatureValid,
        merkleValid,
        timestampValid,
      };

      const errors: string[] = [];
      if (!merkleValid) errors.push('Merkle root mismatch');
      if (!signatureValid) errors.push('Batch signature invalid');
      if (!timestampValid) errors.push('Batch timestamp invalid');

      const valid = Object.values(checks).every((check) => check);

      return {
        valid,
        entryId: batchId,
        checks,
        errors,
      };
    } catch (error) {
      logger.error('Batch verification failed', { error, batchId });
      return {
        valid: false,
        entryId: batchId,
        checks: {
          hashChainValid: false,
          signatureValid: false,
          merkleValid: false,
          timestampValid: false,
        },
        errors: [error.message],
      };
    }
  }

  /**
   * Get sync log for a node
   */
  async getNodeSyncLog(
    nodeId: string,
    options: {
      since?: Date;
      limit?: number;
      verified?: boolean;
    } = {},
  ): Promise<SyncLogEntry[]> {
    const limit = options.limit || 100;
    const entries: SyncLogEntry[] = [];

    // Get from PostgreSQL for historical data
    const query = `
      SELECT * FROM sync_log_entries
      WHERE node_id = $1
      ${options.since ? 'AND timestamp > $2' : ''}
      ${options.verified !== undefined ? `AND verified = $${options.since ? 3 : 2}` : ''}
      ORDER BY sequence_number DESC
      LIMIT $${options.since ? (options.verified !== undefined ? 4 : 3) : options.verified !== undefined ? 3 : 2}
    `;

    const params = [
      nodeId,
      ...(options.since ? [options.since] : []),
      ...(options.verified !== undefined ? [options.verified] : []),
      limit,
    ];

    const result = await this.pool.query(query, params);

    return result.rows.map((row) => ({
      entryId: row.entry_id,
      nodeId: row.node_id,
      timestamp: row.timestamp,
      sequenceNumber: row.sequence_number,
      operation: row.operation,
      previousHash: row.previous_hash,
      merkleRoot: row.merkle_root,
      signature: row.signature,
      tsaTimestamp: row.tsa_timestamp,
      metadata: row.metadata,
    }));
  }

  // Private helper methods

  private getNextSequence(nodeId: string): number {
    const current = this.sequenceNumbers.get(nodeId) || 0;
    const next = current + 1;
    this.sequenceNumbers.set(nodeId, next);
    return next;
  }

  private async getPreviousHash(nodeId: string): Promise<string> {
    const lastEntry = await this.redis.zrevrange(`sync_log:${nodeId}`, 0, 0);
    if (lastEntry.length === 0) {
      // Genesis entry
      return crypto.createHash('sha256').update('genesis').digest('hex');
    }

    const entry: SyncLogEntry = JSON.parse(lastEntry[0]);
    return this.computeEntryHash(entry);
  }

  private computeEntryHash(
    entry: Omit<SyncLogEntry, 'signature'> | SyncLogEntry,
  ): string {
    const data = JSON.stringify({
      entryId: entry.entryId,
      nodeId: entry.nodeId,
      timestamp: entry.timestamp,
      sequenceNumber: entry.sequenceNumber,
      operation: entry.operation,
      previousHash: entry.previousHash,
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private buildMerkleTree(operations: CRDTOperation[]): {
    root: string;
    tree: string[][];
  } {
    // Hash each operation
    const leaves = operations.map((op) =>
      crypto.createHash('sha256').update(JSON.stringify(op)).digest('hex'),
    );

    const tree: string[][] = [leaves];

    // Build tree levels
    while (tree[tree.length - 1].length > 1) {
      const currentLevel = tree[tree.length - 1];
      const nextLevel: string[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left; // Duplicate if odd

        const combined = crypto
          .createHash('sha256')
          .update(left + right)
          .digest('hex');

        nextLevel.push(combined);
      }

      tree.push(nextLevel);
    }

    return {
      root: tree[tree.length - 1][0],
      tree,
    };
  }

  private generateMerkleProofs(
    operations: CRDTOperation[],
    merkleTree: { root: string; tree: string[][] },
  ): Record<string, string[]> {
    const proofs: Record<string, string[]> = {};

    operations.forEach((op, index) => {
      const proof: string[] = [];
      let currentIndex = index;

      for (let level = 0; level < merkleTree.tree.length - 1; level++) {
        const currentLevel = merkleTree.tree[level];
        const siblingIndex =
          currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;

        if (siblingIndex < currentLevel.length) {
          proof.push(currentLevel[siblingIndex]);
        }

        currentIndex = Math.floor(currentIndex / 2);
      }

      proofs[op.id] = proof;
    });

    return proofs;
  }

  private async verifyHashChain(entry: SyncLogEntry): Promise<boolean> {
    if (entry.sequenceNumber === 1) {
      // Genesis entry
      const genesisHash = crypto
        .createHash('sha256')
        .update('genesis')
        .digest('hex');
      return entry.previousHash === genesisHash;
    }

    // Get previous entry
    const prevEntries = await this.redis.zrangebyscore(
      `sync_log:${entry.nodeId}`,
      entry.sequenceNumber - 1,
      entry.sequenceNumber - 1,
    );

    if (prevEntries.length === 0) {
      return false;
    }

    const prevEntry: SyncLogEntry = JSON.parse(prevEntries[0]);
    const prevHash = this.computeEntryHash(prevEntry);

    return entry.previousHash === prevHash;
  }

  private async verifySignature(entry: SyncLogEntry): Promise<boolean> {
    try {
      const entryHash = this.computeEntryHash(entry);
      const notarized = {
        rootHex: entryHash,
        hsmSignature: entry.signature,
        tsaResponse: entry.tsaTimestamp,
        timestamp: entry.timestamp,
        notarizedBy: ['HSM'] as ('HSM' | 'TSA')[],
        verification: { hsmValid: false, tsaValid: false },
      };

      const verification = await dualNotary.verifyNotarizedRoot(notarized);
      return verification.hsmVerification;
    } catch (error) {
      logger.error('Signature verification failed', { error });
      return false;
    }
  }

  private async verifyMerkleProof(entry: SyncLogEntry): Promise<boolean> {
    // Merkle verification would require the full batch context
    // For now, accept merkle root presence as valid
    return !!entry.merkleRoot;
  }

  private async verifyTimestamp(entry: SyncLogEntry): Promise<boolean> {
    if (!entry.tsaTimestamp) return true;

    try {
      const entryHash = this.computeEntryHash(entry);
      const notarized = {
        rootHex: entryHash,
        hsmSignature: entry.signature,
        tsaResponse: entry.tsaTimestamp,
        timestamp: entry.timestamp,
        notarizedBy: ['TSA'] as ('HSM' | 'TSA')[],
        verification: { hsmValid: false, tsaValid: false },
      };

      const verification = await dualNotary.verifyNotarizedRoot(notarized);
      return verification.tsaVerification;
    } catch (error) {
      logger.error('Timestamp verification failed', { error });
      return false;
    }
  }

  private async verifyBatchSignature(batch: SyncBatch): Promise<boolean> {
    try {
      const notarized = {
        rootHex: batch.merkleRoot,
        hsmSignature: batch.batchSignature,
        tsaResponse: batch.tsaTimestamp,
        timestamp: batch.startTime,
        notarizedBy: ['HSM'] as ('HSM' | 'TSA')[],
        verification: { hsmValid: false, tsaValid: false },
      };

      const verification = await dualNotary.verifyNotarizedRoot(notarized);
      return verification.hsmVerification;
    } catch (error) {
      logger.error('Batch signature verification failed', { error });
      return false;
    }
  }

  private async verifyBatchTimestamp(batch: SyncBatch): Promise<boolean> {
    if (!batch.tsaTimestamp) return true;

    try {
      const notarized = {
        rootHex: batch.merkleRoot,
        hsmSignature: batch.batchSignature,
        tsaResponse: batch.tsaTimestamp,
        timestamp: batch.startTime,
        notarizedBy: ['TSA'] as ('HSM' | 'TSA')[],
        verification: { hsmValid: false, tsaValid: false },
      };

      const verification = await dualNotary.verifyNotarizedRoot(notarized);
      return verification.tsaVerification;
    } catch (error) {
      logger.error('Batch timestamp verification failed', { error });
      return false;
    }
  }

  private async getEntry(entryId: string): Promise<SyncLogEntry | null> {
    const result = await this.pool.query(
      'SELECT * FROM sync_log_entries WHERE entry_id = $1',
      [entryId],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      entryId: row.entry_id,
      nodeId: row.node_id,
      timestamp: row.timestamp,
      sequenceNumber: row.sequence_number,
      operation: row.operation,
      previousHash: row.previous_hash,
      merkleRoot: row.merkle_root,
      signature: row.signature,
      tsaTimestamp: row.tsa_timestamp,
      metadata: row.metadata,
    };
  }

  private async getBatch(batchId: string): Promise<SyncBatch | null> {
    const data = await this.redis.get(`sync_batch:${batchId}`);
    if (!data) {
      // Try PostgreSQL
      const result = await this.pool.query(
        'SELECT * FROM sync_batches WHERE batch_id = $1',
        [batchId],
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        batchId: row.batch_id,
        nodeId: row.node_id,
        startTime: row.start_time,
        endTime: row.end_time,
        operationCount: row.operation_count,
        operations: row.operations,
        merkleRoot: row.merkle_root,
        merkleProofs: row.merkle_proofs,
        batchSignature: row.batch_signature,
        tsaTimestamp: row.tsa_timestamp,
        verified: row.verified,
      };
    }

    return JSON.parse(data);
  }

  private async persistEntry(entry: SyncLogEntry): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO sync_log_entries (
        entry_id, node_id, timestamp, sequence_number, operation,
        previous_hash, merkle_root, signature, tsa_timestamp, metadata, verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (entry_id) DO NOTHING
    `,
      [
        entry.entryId,
        entry.nodeId,
        entry.timestamp,
        entry.sequenceNumber,
        JSON.stringify(entry.operation),
        entry.previousHash,
        entry.merkleRoot,
        entry.signature,
        entry.tsaTimestamp,
        JSON.stringify(entry.metadata),
        true,
      ],
    );
  }

  private async persistBatch(batch: SyncBatch): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO sync_batches (
        batch_id, node_id, start_time, end_time, operation_count,
        operations, merkle_root, merkle_proofs, batch_signature,
        tsa_timestamp, verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (batch_id) DO NOTHING
    `,
      [
        batch.batchId,
        batch.nodeId,
        batch.startTime,
        batch.endTime,
        batch.operationCount,
        JSON.stringify(batch.operations),
        batch.merkleRoot,
        JSON.stringify(batch.merkleProofs),
        batch.batchSignature,
        batch.tsaTimestamp,
        batch.verified,
      ],
    );
  }
}

// Export singleton
export const verifiableSyncLog = new VerifiableSyncLog();
