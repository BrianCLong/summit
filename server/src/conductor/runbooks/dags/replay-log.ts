/**
 * Replay Log Implementation
 *
 * Provides cryptographically signed, hash-chained replay logs for runbook executions.
 * Enables full audit trails and deterministic replay of runbook executions.
 */

import { createHash, sign, verify } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { ReplayLogEntry, createReplayLogHash, Evidence } from './types';

/**
 * Replay Log Manager
 */
export class ReplayLog {
  private entries: ReplayLogEntry[] = [];
  private currentHash: string;

  constructor(private privateKey?: string, private publicKey?: string) {
    // Initialize with genesis hash
    this.currentHash = createHash('sha256').update('GENESIS').digest('hex');
  }

  /**
   * Add a node start event
   */
  addNodeStart(nodeId: string): void {
    this.addEntry(nodeId, 'node_start', {});
  }

  /**
   * Add a node complete event
   */
  addNodeComplete(nodeId: string, success: boolean, duration: number): void {
    this.addEntry(nodeId, 'node_complete', { success, duration });
  }

  /**
   * Add a node error event
   */
  addNodeError(nodeId: string, error: Error): void {
    this.addEntry(nodeId, 'node_error', {
      success: false,
      error: error.message,
    });
  }

  /**
   * Add a gate check event
   */
  addGateCheck(nodeId: string, gateName: string, passed: boolean, reason?: string): void {
    this.addEntry(nodeId, 'gate_check', {
      gateResult: { passed, reason },
    });
  }

  /**
   * Add an evidence collected event
   */
  addEvidenceCollected(nodeId: string, evidence: Evidence): void {
    this.addEntry(nodeId, 'evidence_collected', {
      evidence,
    });
  }

  /**
   * Add a publication blocked event
   */
  addPublicationBlocked(nodeId: string, reason: string): void {
    this.addEntry(nodeId, 'publication_blocked', {
      success: false,
      reason,
    });
  }

  /**
   * Add an entry to the replay log
   */
  private addEntry(
    nodeId: string,
    eventType: ReplayLogEntry['eventType'],
    data: ReplayLogEntry['data'],
  ): void {
    const entry: Omit<ReplayLogEntry, 'hash' | 'signature'> = {
      id: uuidv4(),
      timestamp: new Date(),
      nodeId,
      eventType,
      data,
      previousHash: this.currentHash,
    };

    // Compute hash
    const hash = createReplayLogHash(entry);

    // Sign if private key is available
    let signature: string | undefined;
    if (this.privateKey) {
      signature = this.signEntry(entry, hash);
    }

    const fullEntry: ReplayLogEntry = {
      ...entry,
      hash,
      signature,
    };

    this.entries.push(fullEntry);
    this.currentHash = hash;
  }

  /**
   * Sign an entry
   */
  private signEntry(entry: Omit<ReplayLogEntry, 'hash' | 'signature'>, hash: string): string {
    if (!this.privateKey) {
      throw new Error('Private key not available for signing');
    }

    const signature = sign('sha256', Buffer.from(hash), {
      key: this.privateKey,
      padding: 1, // RSA_PKCS1_PADDING
    });

    return signature.toString('base64');
  }

  /**
   * Get all entries
   */
  getEntries(): ReplayLogEntry[] {
    return [...this.entries];
  }

  /**
   * Get the current hash (head of the chain)
   */
  getCurrentHash(): string {
    return this.currentHash;
  }

  /**
   * Verify the integrity of the entire replay log
   */
  verifyIntegrity(publicKey?: string): { valid: boolean; error?: string } {
    const keyToUse = publicKey || this.publicKey;

    let expectedHash = createHash('sha256').update('GENESIS').digest('hex');

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];

      // Verify previous hash linkage
      if (entry.previousHash !== expectedHash) {
        return {
          valid: false,
          error: `Hash chain broken at entry ${i}: expected previousHash ${expectedHash}, got ${entry.previousHash}`,
        };
      }

      // Recompute hash
      const computedHash = createReplayLogHash(entry);
      if (entry.hash !== computedHash) {
        return {
          valid: false,
          error: `Hash mismatch at entry ${i}: expected ${computedHash}, got ${entry.hash}`,
        };
      }

      // Verify signature if available
      if (entry.signature && keyToUse) {
        try {
          const valid = verify(
            'sha256',
            Buffer.from(entry.hash),
            {
              key: keyToUse,
              padding: 1, // RSA_PKCS1_PADDING
            },
            Buffer.from(entry.signature, 'base64'),
          );

          if (!valid) {
            return {
              valid: false,
              error: `Signature verification failed at entry ${i}`,
            };
          }
        } catch (err) {
          return {
            valid: false,
            error: `Signature verification error at entry ${i}: ${err}`,
          };
        }
      }

      expectedHash = entry.hash;
    }

    return { valid: true };
  }

  /**
   * Export the replay log as JSON
   */
  toJSON(): string {
    return JSON.stringify(
      {
        entries: this.entries,
        currentHash: this.currentHash,
        publicKey: this.publicKey,
      },
      null,
      2,
    );
  }

  /**
   * Import a replay log from JSON
   */
  static fromJSON(json: string): ReplayLog {
    const data = JSON.parse(json);
    const log = new ReplayLog(undefined, data.publicKey);
    log.entries = data.entries.map((e: any) => ({
      ...e,
      timestamp: new Date(e.timestamp),
    }));
    log.currentHash = data.currentHash;
    return log;
  }

  /**
   * Create a deterministic replay summary
   */
  getSummary(): {
    totalEntries: number;
    eventCounts: Record<string, number>;
    nodes: string[];
    duration: number;
    success: boolean;
  } {
    const eventCounts: Record<string, number> = {};
    const nodes = new Set<string>();
    let success = true;

    for (const entry of this.entries) {
      eventCounts[entry.eventType] = (eventCounts[entry.eventType] || 0) + 1;
      nodes.add(entry.nodeId);

      if (entry.eventType === 'node_error' || entry.eventType === 'publication_blocked') {
        success = false;
      }
    }

    const duration =
      this.entries.length > 0
        ? this.entries[this.entries.length - 1].timestamp.getTime() - this.entries[0].timestamp.getTime()
        : 0;

    return {
      totalEntries: this.entries.length,
      eventCounts,
      nodes: Array.from(nodes),
      duration,
      success,
    };
  }
}
