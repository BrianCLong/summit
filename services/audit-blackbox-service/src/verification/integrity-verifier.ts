/**
 * Integrity Verifier
 *
 * Comprehensive tools for verifying the integrity of the audit trail.
 * Includes hash chain verification, Merkle proof generation, and
 * anomaly detection.
 *
 * Features:
 * - Full chain verification
 * - Partial/range verification
 * - Merkle proof generation and validation
 * - Anomaly detection (gaps, duplicates, timestamp anomalies)
 * - Scheduled verification jobs
 */

import { createHash, createHmac } from 'crypto';
import { EventEmitter } from 'events';
import type { Pool } from 'pg';
import type {
  IntegrityVerificationResult,
  IntegrityIssue,
  BrokenLink,
  MerkleCheckpoint,
  BlackBoxServiceConfig,
} from '../core/types.js';

/**
 * Verification options
 */
export interface VerificationOptions {
  /** Start time for verification range */
  startTime?: Date;
  /** End time for verification range */
  endTime?: Date;
  /** Start sequence number */
  startSequence?: bigint;
  /** End sequence number */
  endSequence?: bigint;
  /** Verify signatures */
  verifySignatures?: boolean;
  /** Verify Merkle checkpoints */
  verifyCheckpoints?: boolean;
  /** Check for timestamp anomalies */
  checkTimestampAnomalies?: boolean;
  /** Maximum acceptable time gap (ms) */
  maxTimeGapMs?: number;
  /** Batch size for verification */
  batchSize?: number;
}

/**
 * Merkle proof for a single event
 */
export interface MerkleProof {
  eventId: string;
  eventHash: string;
  proof: Array<{
    hash: string;
    position: 'left' | 'right';
  }>;
  checkpointId: string;
  merkleRoot: string;
  verified: boolean;
}

/**
 * Verification report
 */
export interface VerificationReport extends IntegrityVerificationResult {
  /** Report ID */
  reportId: string;
  /** Verification options used */
  options: VerificationOptions;
  /** Duration of verification (ms) */
  durationMs: number;
  /** Anomalies detected */
  anomalies: Array<{
    type: 'sequence_gap' | 'duplicate_sequence' | 'timestamp_regression' | 'large_time_gap';
    description: string;
    sequenceNumbers?: bigint[];
    timestamps?: Date[];
  }>;
  /** Checkpoint verification results */
  checkpointResults?: Array<{
    checkpointId: string;
    valid: boolean;
    expectedMerkleRoot: string;
    calculatedMerkleRoot: string;
  }>;
}

/**
 * Default verification options
 */
const DEFAULT_OPTIONS: VerificationOptions = {
  verifySignatures: true,
  verifyCheckpoints: true,
  checkTimestampAnomalies: true,
  maxTimeGapMs: 60 * 60 * 1000, // 1 hour
  batchSize: 1000,
};

/**
 * Integrity verifier for audit trail
 */
export class IntegrityVerifier extends EventEmitter {
  private pool: Pool;
  private config: BlackBoxServiceConfig;

  // Genesis hash constant
  private static readonly GENESIS_HASH =
    '0000000000000000000000000000000000000000000000000000000000000000';

  constructor(pool: Pool, config: BlackBoxServiceConfig) {
    super();
    this.pool = pool;
    this.config = config;
  }

  /**
   * Perform full integrity verification
   */
  async verify(options: VerificationOptions = {}): Promise<VerificationReport> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();
    const reportId = crypto.randomUUID();

    const issues: IntegrityIssue[] = [];
    const brokenLinks: BrokenLink[] = [];
    const anomalies: VerificationReport['anomalies'] = [];
    const checkpointResults: VerificationReport['checkpointResults'] = [];

    let totalEvents = 0;
    let validEvents = 0;
    let invalidEvents = 0;
    let hashChainValid = true;
    let signaturesValid = true;

    // Build query conditions
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (opts.startTime) {
      conditions.push(`c.timestamp >= $${paramIndex++}`);
      params.push(opts.startTime);
    }
    if (opts.endTime) {
      conditions.push(`c.timestamp <= $${paramIndex++}`);
      params.push(opts.endTime);
    }
    if (opts.startSequence !== undefined) {
      conditions.push(`c.sequence >= $${paramIndex++}`);
      params.push(opts.startSequence.toString());
    }
    if (opts.endSequence !== undefined) {
      conditions.push(`c.sequence <= $${paramIndex++}`);
      params.push(opts.endSequence.toString());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM audit_chain c ${whereClause}`,
      params,
    );
    totalEvents = parseInt(countResult.rows[0].count, 10);

    // Get the expected previous hash for the first entry
    let expectedPreviousHash: string;

    if (opts.startSequence && opts.startSequence > 1n) {
      const prevResult = await this.pool.query(
        'SELECT chain_hash FROM audit_chain WHERE sequence = $1',
        [(opts.startSequence - 1n).toString()],
      );
      expectedPreviousHash = prevResult.rows[0]?.chain_hash || IntegrityVerifier.GENESIS_HASH;
    } else {
      // Get the first sequence we're verifying
      const firstResult = await this.pool.query(
        `SELECT sequence FROM audit_chain c ${whereClause} ORDER BY sequence ASC LIMIT 1`,
        params,
      );
      const firstSequence = firstResult.rows[0]?.sequence
        ? BigInt(firstResult.rows[0].sequence)
        : 1n;

      if (firstSequence === 1n) {
        expectedPreviousHash = IntegrityVerifier.GENESIS_HASH;
      } else {
        const prevResult = await this.pool.query(
          'SELECT chain_hash FROM audit_chain WHERE sequence = $1',
          [(firstSequence - 1n).toString()],
        );
        expectedPreviousHash = prevResult.rows[0]?.chain_hash || IntegrityVerifier.GENESIS_HASH;
      }
    }

    // Process in batches
    let offset = 0;
    let previousTimestamp: Date | null = null;
    let previousSequence: bigint | null = null;

    while (offset < totalEvents) {
      const batchResult = await this.pool.query(
        `SELECT c.*, e.* FROM audit_chain c
         JOIN audit_events e ON c.event_id = e.id
         ${whereClause}
         ORDER BY c.sequence ASC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, opts.batchSize, offset],
      );

      for (const row of batchResult.rows) {
        const sequence = BigInt(row.sequence);
        const eventId = row.event_id;
        const timestamp = new Date(row.timestamp);

        // Check for sequence gaps
        if (previousSequence !== null && sequence !== previousSequence + 1n) {
          anomalies.push({
            type: 'sequence_gap',
            description: `Gap in sequence: ${previousSequence} to ${sequence}`,
            sequenceNumbers: [previousSequence, sequence],
          });
        }

        // Check for timestamp anomalies
        if (opts.checkTimestampAnomalies && previousTimestamp) {
          // Timestamp regression
          if (timestamp < previousTimestamp) {
            anomalies.push({
              type: 'timestamp_regression',
              description: `Timestamp goes backwards at sequence ${sequence}`,
              sequenceNumbers: [sequence],
              timestamps: [previousTimestamp, timestamp],
            });
          }

          // Large time gap
          const gap = timestamp.getTime() - previousTimestamp.getTime();
          if (gap > opts.maxTimeGapMs!) {
            anomalies.push({
              type: 'large_time_gap',
              description: `Large time gap of ${gap}ms at sequence ${sequence}`,
              sequenceNumbers: [previousSequence!, sequence],
              timestamps: [previousTimestamp, timestamp],
            });
          }
        }

        // Verify event hash
        const calculatedEventHash = this.calculateEventHash(row);
        if (calculatedEventHash !== row.event_hash) {
          issues.push({
            eventId,
            sequenceNumber: sequence,
            timestamp,
            issueType: 'hash_mismatch',
            description: 'Event hash does not match calculated hash',
            severity: 'critical',
            expected: calculatedEventHash,
            actual: row.event_hash,
          });
          invalidEvents++;
          previousSequence = sequence;
          previousTimestamp = timestamp;
          expectedPreviousHash = row.chain_hash;
          continue;
        }

        // Verify previous hash linkage
        if (row.previous_hash !== expectedPreviousHash) {
          issues.push({
            eventId,
            sequenceNumber: sequence,
            timestamp,
            issueType: 'chain_broken',
            description: 'Previous hash does not match expected hash',
            severity: 'critical',
            expected: expectedPreviousHash,
            actual: row.previous_hash,
          });
          brokenLinks.push({
            eventId,
            sequenceNumber: sequence,
            expectedHash: expectedPreviousHash,
            actualHash: row.previous_hash,
          });
          hashChainValid = false;
          invalidEvents++;
          previousSequence = sequence;
          previousTimestamp = timestamp;
          expectedPreviousHash = row.chain_hash;
          continue;
        }

        // Verify chain hash
        const calculatedChainHash = this.calculateChainHash(
          row.event_hash,
          row.previous_hash,
          sequence,
        );
        if (calculatedChainHash !== row.chain_hash) {
          issues.push({
            eventId,
            sequenceNumber: sequence,
            timestamp,
            issueType: 'hash_mismatch',
            description: 'Chain hash does not match calculated hash',
            severity: 'critical',
            expected: calculatedChainHash,
            actual: row.chain_hash,
          });
          invalidEvents++;
          previousSequence = sequence;
          previousTimestamp = timestamp;
          expectedPreviousHash = row.chain_hash;
          continue;
        }

        // Verify signature
        if (opts.verifySignatures && row.signature) {
          const isValidSignature = this.verifySignature(
            row.event_hash,
            row.chain_hash,
            sequence,
            row.signature,
          );

          if (!isValidSignature) {
            issues.push({
              eventId,
              sequenceNumber: sequence,
              timestamp,
              issueType: 'signature_invalid',
              description: 'Signature verification failed',
              severity: 'high',
            });
            signaturesValid = false;
            invalidEvents++;
            previousSequence = sequence;
            previousTimestamp = timestamp;
            expectedPreviousHash = row.chain_hash;
            continue;
          }
        }

        validEvents++;
        previousSequence = sequence;
        previousTimestamp = timestamp;
        expectedPreviousHash = row.chain_hash;
      }

      offset += opts.batchSize!;

      // Emit progress
      this.emit('progress', {
        processed: Math.min(offset, totalEvents),
        total: totalEvents,
        issuesFound: issues.length,
      });
    }

    // Verify Merkle checkpoints
    if (opts.verifyCheckpoints) {
      const checkpoints = await this.getCheckpointsInRange(opts);

      for (const checkpoint of checkpoints) {
        const result = await this.verifyCheckpoint(checkpoint);
        checkpointResults.push(result);

        if (!result.valid) {
          issues.push({
            eventId: checkpoint.id,
            sequenceNumber: checkpoint.endSequence,
            timestamp: checkpoint.timestamp,
            issueType: 'hash_mismatch',
            description: 'Merkle checkpoint verification failed',
            severity: 'high',
            expected: result.expectedMerkleRoot,
            actual: result.calculatedMerkleRoot,
          });
        }
      }
    }

    const durationMs = Date.now() - startTime;

    // Determine time range from actual data
    const rangeResult = await this.pool.query(
      `SELECT MIN(timestamp) as start_time, MAX(timestamp) as end_time
       FROM audit_chain c ${whereClause}`,
      params,
    );

    const report: VerificationReport = {
      reportId,
      valid: issues.length === 0,
      verifiedAt: new Date(),
      timeRange: {
        start: rangeResult.rows[0]?.start_time
          ? new Date(rangeResult.rows[0].start_time)
          : new Date(),
        end: rangeResult.rows[0]?.end_time
          ? new Date(rangeResult.rows[0].end_time)
          : new Date(),
      },
      summary: {
        totalEvents,
        validEvents,
        invalidEvents,
        hashChainValid,
        merkleRootValid: checkpointResults.every((r) => r.valid),
        signaturesValid,
      },
      issues,
      chainVerification: {
        startHash: IntegrityVerifier.GENESIS_HASH,
        endHash: expectedPreviousHash,
        chainIntact: hashChainValid,
        brokenLinks,
      },
      options: opts,
      durationMs,
      anomalies,
      checkpointResults,
    };

    this.emit('complete', report);

    return report;
  }

  /**
   * Generate Merkle proof for a specific event
   */
  async generateMerkleProof(eventId: string): Promise<MerkleProof | null> {
    // Get the event's chain entry
    const eventResult = await this.pool.query(
      'SELECT * FROM audit_chain WHERE event_id = $1',
      [eventId],
    );

    if (eventResult.rows.length === 0) {
      return null;
    }

    const chainEntry = eventResult.rows[0];
    const sequence = BigInt(chainEntry.sequence);

    // Find the checkpoint that includes this event
    const checkpointResult = await this.pool.query(
      `SELECT * FROM audit_checkpoints
       WHERE start_sequence <= $1 AND end_sequence >= $1
       ORDER BY end_sequence DESC LIMIT 1`,
      [sequence.toString()],
    );

    if (checkpointResult.rows.length === 0) {
      return null;
    }

    const checkpoint = checkpointResult.rows[0];

    // Get all chain hashes in the checkpoint range
    const hashesResult = await this.pool.query(
      `SELECT event_id, chain_hash, sequence FROM audit_chain
       WHERE sequence >= $1 AND sequence <= $2
       ORDER BY sequence ASC`,
      [checkpoint.start_sequence, checkpoint.end_sequence],
    );

    const hashes = hashesResult.rows.map((r) => ({
      eventId: r.event_id,
      hash: r.chain_hash,
      sequence: BigInt(r.sequence),
    }));

    // Find the index of our event
    const eventIndex = hashes.findIndex((h) => h.eventId === eventId);
    if (eventIndex === -1) {
      return null;
    }

    // Generate Merkle proof
    const proof = this.buildMerkleProof(
      hashes.map((h) => h.hash),
      eventIndex,
    );

    // Verify the proof
    const verified = this.verifyMerkleProof(
      chainEntry.chain_hash,
      proof,
      checkpoint.merkle_root,
    );

    return {
      eventId,
      eventHash: chainEntry.chain_hash,
      proof,
      checkpointId: checkpoint.id,
      merkleRoot: checkpoint.merkle_root,
      verified,
    };
  }

  /**
   * Verify a Merkle proof
   */
  verifyMerkleProof(
    eventHash: string,
    proof: MerkleProof['proof'],
    expectedRoot: string,
  ): boolean {
    let currentHash = eventHash;

    for (const step of proof) {
      const combined =
        step.position === 'left'
          ? step.hash + currentHash
          : currentHash + step.hash;
      currentHash = createHash('sha256').update(combined).digest('hex');
    }

    return currentHash === expectedRoot;
  }

  /**
   * Get verification summary (quick check)
   */
  async getVerificationSummary(): Promise<{
    totalEvents: number;
    lastVerifiedAt: Date | null;
    lastSequence: bigint;
    lastChainHash: string;
    checkpointCount: number;
    oldestEvent: Date | null;
    newestEvent: Date | null;
  }> {
    const [countResult, lastChainResult, checkpointCountResult, rangeResult] =
      await Promise.all([
        this.pool.query('SELECT COUNT(*) FROM audit_events'),
        this.pool.query(
          'SELECT sequence, chain_hash, timestamp FROM audit_chain ORDER BY sequence DESC LIMIT 1',
        ),
        this.pool.query('SELECT COUNT(*) FROM audit_checkpoints'),
        this.pool.query(
          'SELECT MIN(timestamp) as oldest, MAX(timestamp) as newest FROM audit_events',
        ),
      ]);

    return {
      totalEvents: parseInt(countResult.rows[0].count, 10),
      lastVerifiedAt: null, // Would come from verification log
      lastSequence: lastChainResult.rows[0]
        ? BigInt(lastChainResult.rows[0].sequence)
        : 0n,
      lastChainHash:
        lastChainResult.rows[0]?.chain_hash || IntegrityVerifier.GENESIS_HASH,
      checkpointCount: parseInt(checkpointCountResult.rows[0].count, 10),
      oldestEvent: rangeResult.rows[0]?.oldest
        ? new Date(rangeResult.rows[0].oldest)
        : null,
      newestEvent: rangeResult.rows[0]?.newest
        ? new Date(rangeResult.rows[0].newest)
        : null,
    };
  }

  /**
   * Calculate event hash from database row
   */
  private calculateEventHash(row: Record<string, unknown>): string {
    const hashableData = {
      id: row.id,
      eventType: row.event_type,
      level: row.level,
      timestamp:
        row.timestamp instanceof Date
          ? row.timestamp.toISOString()
          : row.timestamp,
      correlationId: row.correlation_id,
      tenantId: row.tenant_id,
      serviceId: row.service_id,
      serviceName: row.service_name,
      environment: row.environment,
      userId: row.user_id,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      action: row.action,
      outcome: row.outcome,
      message: row.message,
      details: row.details,
      complianceRelevant: row.compliance_relevant,
      complianceFrameworks: row.compliance_frameworks,
    };

    const sortedJson = JSON.stringify(
      hashableData,
      Object.keys(hashableData).sort(),
    );
    return createHash('sha256').update(sortedJson).digest('hex');
  }

  /**
   * Calculate chain hash
   */
  private calculateChainHash(
    eventHash: string,
    previousHash: string,
    sequence: bigint,
  ): string {
    const data = `${eventHash}:${previousHash}:${sequence.toString()}`;
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  private verifySignature(
    eventHash: string,
    chainHash: string,
    sequence: bigint,
    signature: string,
  ): boolean {
    const data = JSON.stringify({
      eventHash,
      chainHash,
      sequence: sequence.toString(),
    });

    const expectedSignature = createHmac('sha256', this.config.signingKey)
      .update(data)
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Get checkpoints in verification range
   */
  private async getCheckpointsInRange(
    opts: VerificationOptions,
  ): Promise<MerkleCheckpoint[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (opts.startTime) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      params.push(opts.startTime);
    }
    if (opts.endTime) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      params.push(opts.endTime);
    }
    if (opts.startSequence !== undefined) {
      conditions.push(`end_sequence >= $${paramIndex++}`);
      params.push(opts.startSequence.toString());
    }
    if (opts.endSequence !== undefined) {
      conditions.push(`start_sequence <= $${paramIndex++}`);
      params.push(opts.endSequence.toString());
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.pool.query(
      `SELECT * FROM audit_checkpoints ${whereClause} ORDER BY end_sequence ASC`,
      params,
    );

    return result.rows.map((row) => ({
      id: row.id,
      startSequence: BigInt(row.start_sequence),
      endSequence: BigInt(row.end_sequence),
      timestamp: new Date(row.timestamp),
      eventCount: row.event_count,
      merkleRoot: row.merkle_root,
      signature: row.signature,
      publicKeyId: row.public_key_id,
    }));
  }

  /**
   * Verify a single checkpoint
   */
  private async verifyCheckpoint(checkpoint: MerkleCheckpoint): Promise<{
    checkpointId: string;
    valid: boolean;
    expectedMerkleRoot: string;
    calculatedMerkleRoot: string;
  }> {
    // Get chain hashes for the checkpoint range
    const result = await this.pool.query(
      `SELECT chain_hash FROM audit_chain
       WHERE sequence >= $1 AND sequence <= $2
       ORDER BY sequence ASC`,
      [checkpoint.startSequence.toString(), checkpoint.endSequence.toString()],
    );

    const hashes = result.rows.map((row) => row.chain_hash);
    const calculatedMerkleRoot = this.calculateMerkleRoot(hashes);

    return {
      checkpointId: checkpoint.id,
      valid: calculatedMerkleRoot === checkpoint.merkleRoot,
      expectedMerkleRoot: checkpoint.merkleRoot,
      calculatedMerkleRoot,
    };
  }

  /**
   * Calculate Merkle root from hashes
   */
  private calculateMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) return '';
    if (hashes.length === 1) return hashes[0];

    const nextLevel: string[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] || left;
      const combined = createHash('sha256')
        .update(left + right)
        .digest('hex');
      nextLevel.push(combined);
    }

    return this.calculateMerkleRoot(nextLevel);
  }

  /**
   * Build Merkle proof for an element at index
   */
  private buildMerkleProof(
    hashes: string[],
    index: number,
  ): MerkleProof['proof'] {
    const proof: MerkleProof['proof'] = [];

    if (hashes.length <= 1) return proof;

    let currentLevel = hashes;
    let currentIndex = index;

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      const siblingIndex =
        currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;

      if (siblingIndex < currentLevel.length) {
        proof.push({
          hash: currentLevel[siblingIndex],
          position: currentIndex % 2 === 0 ? 'right' : 'left',
        });
      } else {
        // Duplicate the last element if odd number
        proof.push({
          hash: currentLevel[currentIndex],
          position: 'right',
        });
      }

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left;
        const combined = createHash('sha256')
          .update(left + right)
          .digest('hex');
        nextLevel.push(combined);
      }

      currentLevel = nextLevel;
      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }
}
