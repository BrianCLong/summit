/**
 * Tamper-Evident Audit Log with Hash Chain
 * Sprint 27D: Append-only audit trail with cryptographic integrity
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  purpose?: string;
  result: 'allow' | 'deny' | 'error';
  metadata: Record<string, any>;
  policyVersion?: string;
  fieldsRedacted?: string[];
  dlpRules?: string[];
}

export interface HashChainEntry {
  sequence: number;
  timestamp: string;
  eventHash: string;
  previousHash: string;
  chainHash: string;
  signature?: string;
}

export interface Checkpoint {
  sequence: number;
  timestamp: string;
  eventCount: number;
  merkleRoot: string;
  signature: string;
}

export class AuditHashChain {
  private logPath: string;
  private checkpointPath: string;
  private privateKey?: string;
  private currentSequence: number = 0;
  private lastHash: string =
    '0000000000000000000000000000000000000000000000000000000000000000';

  constructor(logPath: string, privateKey?: string) {
    this.logPath = logPath;
    this.checkpointPath = logPath.replace('.log', '.checkpoints');
    this.privateKey = privateKey;
    this.ensureLogDirectory();
  }

  /**
   * Append audit event to hash chain
   */
  async appendEvent(event: AuditEvent): Promise<HashChainEntry> {
    // Ensure event has required fields
    if (!event.id) {
      event.id = crypto.randomUUID();
    }
    if (!event.timestamp) {
      event.timestamp = new Date().toISOString();
    }

    // Calculate event hash
    const eventData = JSON.stringify(event, Object.keys(event).sort());
    const eventHash = crypto
      .createHash('sha256')
      .update(eventData)
      .digest('hex');

    // Create hash chain entry
    const entry: HashChainEntry = {
      sequence: ++this.currentSequence,
      timestamp: event.timestamp,
      eventHash,
      previousHash: this.lastHash,
      chainHash: this.calculateChainHash(
        eventHash,
        this.lastHash,
        this.currentSequence,
      ),
    };

    // Sign entry if private key available
    if (this.privateKey) {
      entry.signature = this.signEntry(entry);
    }

    // Update last hash for next entry
    this.lastHash = entry.chainHash;

    // Append to log file
    await this.writeLogEntry(event, entry);

    // Create checkpoint every 1000 entries
    if (this.currentSequence % 1000 === 0) {
      await this.createCheckpoint();
    }

    return entry;
  }

  /**
   * Verify hash chain integrity
   */
  async verifyChain(
    startSequence = 1,
    endSequence?: number,
  ): Promise<{
    valid: boolean;
    errors: string[];
    verifiedEntries: number;
  }> {
    const errors: string[] = [];
    let verifiedEntries = 0;
    let expectedPreviousHash =
      startSequence === 1
        ? '0000000000000000000000000000000000000000000000000000000000000000'
        : await this.getHashAtSequence(startSequence - 1);

    const entries = await this.readLogEntries(startSequence, endSequence);

    for (const { event, chainEntry } of entries) {
      // Verify event hash
      const eventData = JSON.stringify(event, Object.keys(event).sort());
      const calculatedEventHash = crypto
        .createHash('sha256')
        .update(eventData)
        .digest('hex');

      if (calculatedEventHash !== chainEntry.eventHash) {
        errors.push(`Sequence ${chainEntry.sequence}: Event hash mismatch`);
        continue;
      }

      // Verify previous hash linkage
      if (chainEntry.previousHash !== expectedPreviousHash) {
        errors.push(`Sequence ${chainEntry.sequence}: Previous hash mismatch`);
        continue;
      }

      // Verify chain hash
      const calculatedChainHash = this.calculateChainHash(
        chainEntry.eventHash,
        chainEntry.previousHash,
        chainEntry.sequence,
      );

      if (calculatedChainHash !== chainEntry.chainHash) {
        errors.push(`Sequence ${chainEntry.sequence}: Chain hash mismatch`);
        continue;
      }

      // Verify signature if present
      if (chainEntry.signature && this.privateKey) {
        if (!this.verifySignature(chainEntry)) {
          errors.push(`Sequence ${chainEntry.sequence}: Invalid signature`);
          continue;
        }
      }

      verifiedEntries++;
      expectedPreviousHash = chainEntry.chainHash;
    }

    return {
      valid: errors.length === 0,
      errors,
      verifiedEntries,
    };
  }

  /**
   * Create merkle root checkpoint
   */
  async createCheckpoint(): Promise<Checkpoint> {
    const recentEntries = await this.readLogEntries(
      Math.max(1, this.currentSequence - 999),
      this.currentSequence,
    );

    // Calculate merkle root
    const hashes = recentEntries.map((entry) => entry.chainEntry.chainHash);
    const merkleRoot = this.calculateMerkleRoot(hashes);

    const checkpoint: Checkpoint = {
      sequence: this.currentSequence,
      timestamp: new Date().toISOString(),
      eventCount: recentEntries.length,
      merkleRoot,
      signature: '',
    };

    // Sign checkpoint
    if (this.privateKey) {
      const checkpointData = JSON.stringify({
        sequence: checkpoint.sequence,
        timestamp: checkpoint.timestamp,
        eventCount: checkpoint.eventCount,
        merkleRoot: checkpoint.merkleRoot,
      });
      checkpoint.signature = crypto
        .sign('sha256', Buffer.from(checkpointData), this.privateKey)
        .toString('hex');
    }

    // Save checkpoint
    await this.writeCheckpoint(checkpoint);

    return checkpoint;
  }

  /**
   * Time source validation
   */
  static async validateTimeSource(): Promise<{
    valid: boolean;
    skew: number;
    ntpTime?: Date;
    systemTime: Date;
  }> {
    const systemTime = new Date();

    try {
      // Simple NTP check (in production, use proper NTP client)
      const ntpResponse = await fetch(
        'http://worldtimeapi.org/api/timezone/UTC',
      );
      const ntpData = await ntpResponse.json();
      const ntpTime = new Date(ntpData.utc_datetime);

      const skew = Math.abs(systemTime.getTime() - ntpTime.getTime());
      const maxSkew = 30000; // 30 seconds tolerance

      return {
        valid: skew <= maxSkew,
        skew,
        ntpTime,
        systemTime,
      };
    } catch (error) {
      console.warn('NTP validation failed:', error.message);
      return {
        valid: false,
        skew: -1,
        systemTime,
      };
    }
  }

  private calculateChainHash(
    eventHash: string,
    previousHash: string,
    sequence: number,
  ): string {
    const data = `${eventHash}:${previousHash}:${sequence}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private signEntry(entry: HashChainEntry): string {
    if (!this.privateKey) return '';

    const entryData = JSON.stringify({
      sequence: entry.sequence,
      timestamp: entry.timestamp,
      eventHash: entry.eventHash,
      previousHash: entry.previousHash,
      chainHash: entry.chainHash,
    });

    return crypto
      .sign('sha256', Buffer.from(entryData), this.privateKey)
      .toString('hex');
  }

  private verifySignature(entry: HashChainEntry): boolean {
    if (!entry.signature || !this.privateKey) return false;

    const entryData = JSON.stringify({
      sequence: entry.sequence,
      timestamp: entry.timestamp,
      eventHash: entry.eventHash,
      previousHash: entry.previousHash,
      chainHash: entry.chainHash,
    });

    try {
      return crypto.verify(
        'sha256',
        Buffer.from(entryData),
        this.privateKey,
        Buffer.from(entry.signature, 'hex'),
      );
    } catch {
      return false;
    }
  }

  private calculateMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) return '';
    if (hashes.length === 1) return hashes[0];

    const nextLevel: string[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] || left; // Duplicate if odd number
      const combined = crypto
        .createHash('sha256')
        .update(left + right)
        .digest('hex');
      nextLevel.push(combined);
    }

    return this.calculateMerkleRoot(nextLevel);
  }

  private async ensureLogDirectory(): Promise<void> {
    const dir = path.dirname(this.logPath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  private async writeLogEntry(
    event: AuditEvent,
    chainEntry: HashChainEntry,
  ): Promise<void> {
    const logLine =
      JSON.stringify({
        event,
        chainEntry,
        timestamp: new Date().toISOString(),
      }) + '\n';

    await fs.appendFile(this.logPath, logLine);
  }

  private async writeCheckpoint(checkpoint: Checkpoint): Promise<void> {
    const checkpointLine = JSON.stringify(checkpoint) + '\n';
    await fs.appendFile(this.checkpointPath, checkpointLine);
  }

  private async readLogEntries(
    startSequence: number,
    endSequence?: number,
  ): Promise<
    Array<{
      event: AuditEvent;
      chainEntry: HashChainEntry;
    }>
  > {
    try {
      const content = await fs.readFile(this.logPath, 'utf-8');
      const lines = content
        .trim()
        .split('\n')
        .filter((line) => line);
      const entries: Array<{ event: AuditEvent; chainEntry: HashChainEntry }> =
        [];

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (
            parsed.chainEntry.sequence >= startSequence &&
            (!endSequence || parsed.chainEntry.sequence <= endSequence)
          ) {
            entries.push(parsed);
          }
        } catch {
          // Skip malformed lines
        }
      }

      return entries;
    } catch {
      return [];
    }
  }

  private async getHashAtSequence(sequence: number): Promise<string> {
    const entries = await this.readLogEntries(sequence, sequence);
    return entries[0]?.chainEntry.chainHash || this.lastHash;
  }
}
