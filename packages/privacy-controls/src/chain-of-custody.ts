/**
 * Chain of Custody with Digital Signatures
 * Evidence handling and forensic timestamping
 */

import { Pool } from 'pg';
import { createHash, randomUUID } from 'node:crypto';
import { ChainOfCustody } from '@intelgraph/compliance';
import { AuditLogger } from '@intelgraph/audit-logging';

export class ChainOfCustodyManager {
  private pool: Pool;
  private auditLogger?: AuditLogger;

  constructor(pool: Pool, auditLogger?: AuditLogger) {
    this.pool = pool;
    this.auditLogger = auditLogger;
  }

  /**
   * Initialize chain of custody tables
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS chain_of_custody (
          id VARCHAR(255) PRIMARY KEY,
          evidence_id VARCHAR(255) NOT NULL,
          evidence_name VARCHAR(255) NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL,
          action VARCHAR(50) NOT NULL,
          from_custodian VARCHAR(255) NOT NULL,
          to_custodian VARCHAR(255) NOT NULL,
          location TEXT NOT NULL,
          purpose TEXT NOT NULL,
          digital_signature TEXT,
          witness_signature TEXT,
          hash VARCHAR(64) NOT NULL,
          forensic_timestamp TEXT,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_chain_of_custody_evidence ON chain_of_custody(evidence_id);
        CREATE INDEX IF NOT EXISTS idx_chain_of_custody_timestamp ON chain_of_custody(timestamp DESC);

        CREATE TABLE IF NOT EXISTS evidence_registry (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          type VARCHAR(50) NOT NULL,
          collected_at TIMESTAMPTZ NOT NULL,
          collected_by VARCHAR(255) NOT NULL,
          current_custodian VARCHAR(255) NOT NULL,
          current_location TEXT NOT NULL,
          hash VARCHAR(64) NOT NULL,
          integrity_verified BOOLEAN DEFAULT TRUE,
          status VARCHAR(50) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_evidence_registry_custodian ON evidence_registry(current_custodian);
      `);
    } finally {
      client.release();
    }
  }

  /**
   * Record custody transfer
   */
  async recordTransfer(
    evidenceId: string,
    evidenceName: string,
    action: 'collected' | 'transferred' | 'analyzed' | 'archived' | 'destroyed',
    fromCustodian: string,
    toCustodian: string,
    location: string,
    purpose: string,
    evidenceData: Buffer | string,
    digitalSignature?: string,
    witnessSignature?: string
  ): Promise<ChainOfCustody> {
    const hash = this.calculateHash(evidenceData);
    const forensicTimestamp = this.generateForensicTimestamp();

    const custody: ChainOfCustody = {
      id: randomUUID(),
      evidenceId,
      evidenceName,
      timestamp: new Date(),
      action,
      fromCustodian,
      toCustodian,
      location,
      purpose,
      digitalSignature,
      witnessSignature,
      hash,
      forensicTimestamp,
    };

    await this.pool.query(
      `INSERT INTO chain_of_custody
       (id, evidence_id, evidence_name, timestamp, action, from_custodian, to_custodian,
        location, purpose, digital_signature, witness_signature, hash, forensic_timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        custody.id,
        custody.evidenceId,
        custody.evidenceName,
        custody.timestamp,
        custody.action,
        custody.fromCustodian,
        custody.toCustodian,
        custody.location,
        custody.purpose,
        custody.digitalSignature,
        custody.witnessSignature,
        custody.hash,
        custody.forensicTimestamp,
      ]
    );

    // Update evidence registry
    await this.pool.query(
      `UPDATE evidence_registry
       SET current_custodian = $1, current_location = $2, updated_at = NOW()
       WHERE id = $3`,
      [toCustodian, location, evidenceId]
    );

    // Audit log
    if (this.auditLogger) {
      await this.auditLogger.log({
        userId: fromCustodian,
        userName: fromCustodian,
        action: `custody.${action}`,
        resource: 'evidence',
        resourceId: evidenceId,
        outcome: 'success',
        details: { toCustodian, location, purpose },
      });
    }

    return custody;
  }

  /**
   * Verify custody chain integrity
   */
  async verifyChain(evidenceId: string): Promise<{
    valid: boolean;
    breaks: string[];
    totalTransfers: number;
  }> {
    const result = await this.pool.query(
      'SELECT * FROM chain_of_custody WHERE evidence_id = $1 ORDER BY timestamp',
      [evidenceId]
    );

    const transfers = result.rows;
    const breaks: string[] = [];
    let previousHash: string | null = null;

    for (let i = 0; i < transfers.length; i++) {
      const transfer = transfers[i];

      // Check if hash changes unexpectedly (tampering)
      if (i > 0 && transfer.action !== 'analyzed' && transfer.hash !== previousHash) {
        breaks.push(
          `Hash mismatch at transfer ${i}: expected ${previousHash}, got ${transfer.hash}`
        );
      }

      // Check custodian continuity
      if (i > 0 && transfers[i - 1].to_custodian !== transfer.from_custodian) {
        breaks.push(
          `Custodian break at transfer ${i}: ${transfers[i - 1].to_custodian} -> ${transfer.from_custodian}`
        );
      }

      previousHash = transfer.hash;
    }

    return {
      valid: breaks.length === 0,
      breaks,
      totalTransfers: transfers.length,
    };
  }

  /**
   * Calculate SHA-256 hash of evidence
   */
  private calculateHash(data: Buffer | string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate RFC 3161 compliant forensic timestamp
   * In production, this would call a trusted timestamp authority
   */
  private generateForensicTimestamp(): string {
    const timestamp = new Date().toISOString();
    const nonce = randomUUID();
    return `TST:${timestamp}:${nonce}`;
  }
}
