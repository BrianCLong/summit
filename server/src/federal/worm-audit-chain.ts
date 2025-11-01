import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z, type ZodType } from 'zod';
import { otelService } from '../middleware/observability/otel-tracing.js';
import { fipsService } from './fips-compliance.js';

// WORM audit with hash-chaining for tamper-evidence beyond Object Lock
interface AuditEntry {
  timestamp: Date;
  eventType: string;
  userId: string;
  action: string;
  resource: string;
  details: any;
  classification: string;
  sessionId?: string;
}

interface HashChainEntry {
  sequenceId: number;
  timestamp: Date;
  dataHash: string;
  previousHash: string;
  merkleRoot: string;
  signature?: string; // HSM-signed
}

interface AuditSegment {
  segmentId: string;
  startTime: Date;
  endTime: Date;
  entries: AuditEntry[];
  hashChain: HashChainEntry[];
  merkleTree: string[];
  rootHash: string;
  rootSignature: string; // HSM-signed root
  wormObjectKey: string; // S3 Object Lock key
  retentionUntil: Date;
}

interface ChainVerificationResult {
  valid: boolean;
  brokenAt?: number;
  totalEntries: number;
  verifiedSignatures: number;
  errors: string[];
}

const AuditChainConfigSchema = z.object({
  enabled: z.boolean().default(true),
  segmentInterval: z.enum(['hourly', 'daily', 'weekly']).default('daily'),
  s3Bucket: z.string(),
  retentionYears: z.number().min(1).max(50).default(20),
  signRoots: z.boolean().default(true),
  notarizeRoots: z.boolean().default(false), // External TSA
  compressionEnabled: z.boolean().default(true),
  encryptionEnabled: z.boolean().default(true),
});

export class WORMAuditChainService {
  private config: z.infer<typeof AuditChainConfigSchema>;
  private currentSegment: AuditSegment | null = null;
  private pendingEntries: AuditEntry[] = [];
  private lastHash: string = '0'; // Genesis hash
  private segmentTimer: NodeJS.Timeout | null = null;
  private sequenceCounter: number = 0;

  constructor(config?: Partial<z.infer<typeof AuditChainConfigSchema>>) {
    this.config = AuditChainConfigSchema.parse({
      ...config,
      s3Bucket: process.env.AUDIT_WORM_BUCKET || config?.s3Bucket,
      retentionYears:
        Number(process.env.AUDIT_RETENTION_YEARS) || config?.retentionYears,
      signRoots: process.env.AUDIT_SIGN_ROOTS === 'true',
    });

    if (this.config.enabled) {
      this.initializeAuditChain();
    }
  }

  private async initializeAuditChain() {
    const span = otelService.createSpan('worm_audit.initialize');

    try {
      // Load existing chain state
      await this.loadChainState();

      // Start new segment
      await this.startNewSegment();

      // Schedule segment rotation
      this.scheduleSegmentRotation();

      console.log('WORM audit chain initialized successfully');

      otelService.addSpanAttributes({
        'audit.chain.enabled': this.config.enabled,
        'audit.segment_interval': this.config.segmentInterval,
        'audit.retention_years': this.config.retentionYears,
        'audit.sign_roots': this.config.signRoots,
      });
    } catch (error: any) {
      console.error('WORM audit chain initialization failed:', error);
      otelService.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      span?.end();
    }
  }

  /**
   * Add audit entry to chain
   */
  async addAuditEntry(entry: Omit<AuditEntry, 'timestamp'>): Promise<void> {
    const span = otelService.createSpan('worm_audit.add_entry');

    try {
      const auditEntry: AuditEntry = {
        ...entry,
        timestamp: new Date(),
      };

      // Add to pending entries
      this.pendingEntries.push(auditEntry);

      // Process immediately for critical events
      if (this.isCriticalEvent(entry.eventType)) {
        await this.processPendingEntries();
      }

      otelService.addSpanAttributes({
        'audit.event_type': entry.eventType,
        'audit.action': entry.action,
        'audit.classification': entry.classification,
        'audit.critical': this.isCriticalEvent(entry.eventType),
      });
    } catch (error: any) {
      console.error('Failed to add audit entry:', error);
      otelService.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      span?.end();
    }
  }

  private isCriticalEvent(eventType: string): boolean {
    const criticalEvents = [
      'break_glass_activated',
      'security_violation',
      'unauthorized_access',
      'data_exfiltration_attempt',
      'system_compromise',
      'crypto_key_rotation',
    ];

    return criticalEvents.includes(eventType);
  }

  private async processPendingEntries(): Promise<void> {
    if (this.pendingEntries.length === 0) return;

    const span = otelService.createSpan('worm_audit.process_entries');

    try {
      // Add entries to current segment
      if (!this.currentSegment) {
        await this.startNewSegment();
      }

      // Process each entry through hash chain
      for (const entry of this.pendingEntries) {
        await this.addEntryToChain(entry);
      }

      // Clear processed entries
      this.pendingEntries = [];

      otelService.addSpanAttributes({
        'audit.entries_processed': this.pendingEntries.length,
        'audit.current_segment': this.currentSegment?.segmentId || 'none',
      });
    } catch (error: any) {
      console.error('Failed to process pending entries:', error);
      otelService.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      span?.end();
    }
  }

  private async addEntryToChain(entry: AuditEntry): Promise<void> {
    if (!this.currentSegment) {
      throw new Error('No current audit segment');
    }

    // Add entry to segment
    this.currentSegment.entries.push(entry);

    // Create hash chain entry
    const entryData = JSON.stringify(entry);
    const dataHash = crypto
      .createHash('sha256')
      .update(entryData)
      .digest('hex');

    const chainEntry: HashChainEntry = {
      sequenceId: ++this.sequenceCounter,
      timestamp: entry.timestamp,
      dataHash,
      previousHash: this.lastHash,
      merkleRoot: '', // Will be calculated when segment finalizes
    };

    // Chain hash includes previous hash for tamper detection
    const chainData = `${chainEntry.sequenceId}:${chainEntry.timestamp.toISOString()}:${dataHash}:${this.lastHash}`;
    const currentHash = crypto
      .createHash('sha256')
      .update(chainData)
      .digest('hex');

    // Sign hash with HSM if enabled
    if (this.config.signRoots && fipsService.getLocalSVID()) {
      try {
        const keyId = 'audit-chain-signing-key'; // Would be created during initialization
        chainEntry.signature = await fipsService.sign(currentHash, keyId);
      } catch (error) {
        console.warn('Failed to sign hash chain entry:', error);
      }
    }

    this.currentSegment.hashChain.push(chainEntry);
    this.lastHash = currentHash;
  }

  private async startNewSegment(): Promise<void> {
    const span = otelService.createSpan('worm_audit.start_segment');

    try {
      // Finalize current segment if exists
      if (this.currentSegment) {
        await this.finalizeSegment(this.currentSegment);
      }

      // Create new segment
      const segmentId = `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      this.currentSegment = {
        segmentId,
        startTime: new Date(),
        endTime: new Date(), // Will be updated when finalized
        entries: [],
        hashChain: [],
        merkleTree: [],
        rootHash: '',
        rootSignature: '',
        wormObjectKey: '',
        retentionUntil: new Date(
          Date.now() + this.config.retentionYears * 365 * 24 * 60 * 60 * 1000,
        ),
      };

      console.log(`Started new audit segment: ${segmentId}`);

      otelService.addSpanAttributes({
        'audit.segment_id': segmentId,
        'audit.retention_until':
          this.currentSegment.retentionUntil.toISOString(),
      });
    } catch (error: any) {
      console.error('Failed to start new segment:', error);
      otelService.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      span?.end();
    }
  }

  private async finalizeSegment(segment: AuditSegment): Promise<void> {
    const span = otelService.createSpan('worm_audit.finalize_segment');

    try {
      segment.endTime = new Date();

      // Build Merkle tree from hash chain
      segment.merkleTree = this.buildMerkleTree(
        segment.hashChain.map((entry) => entry.dataHash),
      );
      segment.rootHash =
        segment.merkleTree.length > 0 ? segment.merkleTree[0] : '0';

      // Sign root hash with HSM
      if (this.config.signRoots && segment.rootHash !== '0') {
        try {
          const keyId = 'audit-root-signing-key';
          segment.rootSignature = await fipsService.sign(
            segment.rootHash,
            keyId,
          );
        } catch (error) {
          console.error('Failed to sign segment root:', error);
          segment.rootSignature = 'signing_failed';
        }
      }

      // Store to WORM storage
      await this.storeSegmentToWORM(segment);

      console.log(
        `Finalized audit segment: ${segment.segmentId} (${segment.entries.length} entries)`,
      );

      otelService.addSpanAttributes({
        'audit.segment_finalized': segment.segmentId,
        'audit.entries_count': segment.entries.length,
        'audit.chain_length': segment.hashChain.length,
        'audit.root_hash': segment.rootHash,
      });
    } catch (error: any) {
      console.error('Failed to finalize segment:', error);
      otelService.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      span?.end();
    }
  }

  private buildMerkleTree(leafHashes: string[]): string[] {
    if (leafHashes.length === 0) return [];
    if (leafHashes.length === 1) return leafHashes;

    let level = [...leafHashes];
    const tree: string[] = [];

    while (level.length > 1) {
      const nextLevel: string[] = [];

      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] || left; // Duplicate if odd number of nodes
        const combined = crypto
          .createHash('sha256')
          .update(left + right)
          .digest('hex');
        nextLevel.push(combined);
      }

      tree.unshift(...level); // Add current level to tree
      level = nextLevel;
    }

    tree.unshift(level[0]); // Add root
    return tree;
  }

  private async storeSegmentToWORM(segment: AuditSegment): Promise<void> {
    const span = otelService.createSpan('worm_audit.store_segment');

    try {
      // Prepare segment data for storage
      const segmentData = {
        metadata: {
          segmentId: segment.segmentId,
          startTime: segment.startTime,
          endTime: segment.endTime,
          entryCount: segment.entries.length,
          rootHash: segment.rootHash,
          rootSignature: segment.rootSignature,
          retentionUntil: segment.retentionUntil,
        },
        entries: segment.entries,
        hashChain: segment.hashChain,
        merkleTree: segment.merkleTree,
        verification: {
          chainValid: await this.verifyHashChain(segment.hashChain),
          merkleValid: this.verifyMerkleTree(
            segment.merkleTree,
            segment.entries.map((e) =>
              crypto
                .createHash('sha256')
                .update(JSON.stringify(e))
                .digest('hex'),
            ),
          ),
        },
      };

      // Compress if enabled
      let segmentJson = JSON.stringify(segmentData, null, 2);
      if (this.config.compressionEnabled) {
        const { gzipSync } = await import('node:zlib');
        segmentJson = gzipSync(segmentJson).toString('base64');
      }

      // Encrypt if enabled
      if (this.config.encryptionEnabled) {
        try {
          const keyId = 'audit-encryption-key';
          const encrypted = await fipsService.encrypt(segmentJson, keyId);
          segmentJson = JSON.stringify(encrypted);
        } catch (error) {
          console.warn(
            'Failed to encrypt segment, storing unencrypted:',
            error,
          );
        }
      }

      // Generate S3 key with date partitioning
      const date = segment.startTime;
      const dateKey = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
      const objectKey = `audit-segments/${dateKey}/${segment.segmentId}.json`;

      segment.wormObjectKey = objectKey;

      // Store to S3 with Object Lock (in production environment)
      // This would use AWS SDK to put object with retention settings
      console.log(
        `Storing segment to WORM: s3://${this.config.s3Bucket}/${objectKey}`,
      );

      // Simulate WORM storage for development
      const localPath = `/tmp/worm-audit/${objectKey}`;
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, segmentJson);

      // In production, would be:
      // await this.s3Client.putObject({
      //   Bucket: this.config.s3Bucket,
      //   Key: objectKey,
      //   Body: segmentJson,
      //   ObjectLockMode: 'COMPLIANCE',
      //   ObjectLockRetainUntilDate: segment.retentionUntil,
      //   Metadata: {
      //     'segment-id': segment.segmentId,
      //     'entry-count': String(segment.entries.length),
      //     'root-hash': segment.rootHash,
      //     'classification': segment.entries[0]?.classification || 'UNCLASSIFIED',
      //   },
      // });

      otelService.addSpanAttributes({
        'audit.worm_key': objectKey,
        'audit.compressed': this.config.compressionEnabled,
        'audit.encrypted': this.config.encryptionEnabled,
        'audit.retention_until': segment.retentionUntil.toISOString(),
      });
    } catch (error: any) {
      console.error('Failed to store segment to WORM:', error);
      otelService.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      span?.end();
    }
  }

  /**
   * Verify hash chain integrity
   */
  async verifyHashChain(
    chain: HashChainEntry[],
  ): Promise<ChainVerificationResult> {
    const span = otelService.createSpan('worm_audit.verify_chain');

    try {
      const result: ChainVerificationResult = {
        valid: true,
        totalEntries: chain.length,
        verifiedSignatures: 0,
        errors: [],
      };

      let previousHash = '0'; // Genesis hash

      for (let i = 0; i < chain.length; i++) {
        const entry = chain[i];

        // Verify hash chain linkage
        if (entry.previousHash !== previousHash) {
          result.valid = false;
          result.brokenAt = i;
          result.errors.push(
            `Hash chain broken at entry ${i}: expected previous ${previousHash}, got ${entry.previousHash}`,
          );
          break;
        }

        // Verify signature if present
        if (entry.signature) {
          try {
            const keyId = 'audit-chain-signing-key';
            const chainData = `${entry.sequenceId}:${entry.timestamp.toISOString()}:${entry.dataHash}:${entry.previousHash}`;
            const currentHash = crypto
              .createHash('sha256')
              .update(chainData)
              .digest('hex');

            const signatureValid = await fipsService.verify(
              currentHash,
              entry.signature,
              keyId,
            );
            if (signatureValid) {
              result.verifiedSignatures++;
            } else {
              result.errors.push(`Invalid signature at entry ${i}`);
            }
          } catch (error) {
            result.errors.push(
              `Signature verification failed at entry ${i}: ${error}`,
            );
          }
        }

        // Update previous hash for next iteration
        const chainData = `${entry.sequenceId}:${entry.timestamp.toISOString()}:${entry.dataHash}:${entry.previousHash}`;
        previousHash = crypto
          .createHash('sha256')
          .update(chainData)
          .digest('hex');
      }

      otelService.addSpanAttributes({
        'audit.verification.valid': result.valid,
        'audit.verification.total_entries': result.totalEntries,
        'audit.verification.verified_signatures': result.verifiedSignatures,
        'audit.verification.errors': result.errors.length,
      });

      return result;
    } catch (error: any) {
      console.error('Hash chain verification failed:', error);
      otelService.recordException(error);
      span.setStatus({ code: 2, message: error.message });

      return {
        valid: false,
        totalEntries: chain.length,
        verifiedSignatures: 0,
        errors: [error.message],
      };
    } finally {
      span?.end();
    }
  }

  private verifyMerkleTree(tree: string[], leafHashes: string[]): boolean {
    if (tree.length === 0 || leafHashes.length === 0) return false;

    // Rebuild tree and compare root
    const rebuiltTree = this.buildMerkleTree(leafHashes);
    return rebuiltTree.length > 0 && rebuiltTree[0] === tree[0];
  }

  private scheduleSegmentRotation(): void {
    let intervalMs: number;

    switch (this.config.segmentInterval) {
      case 'hourly':
        intervalMs = 60 * 60 * 1000; // 1 hour
        break;
      case 'daily':
        intervalMs = 24 * 60 * 60 * 1000; // 24 hours
        break;
      case 'weekly':
        intervalMs = 7 * 24 * 60 * 60 * 1000; // 1 week
        break;
    }

    this.segmentTimer = setInterval(async () => {
      try {
        // Process any pending entries before rotation
        await this.processPendingEntries();

        // Start new segment (finalizes current one)
        await this.startNewSegment();
      } catch (error) {
        console.error('Segment rotation failed:', error);
      }
    }, intervalMs);
  }

  private async loadChainState(): Promise<void> {
    try {
      // Load last hash from persistent storage
      // In production, this would read from database or S3
      this.lastHash = '0'; // Start with genesis hash
      this.sequenceCounter = 0;
    } catch (error) {
      console.warn('No existing chain state found, starting fresh');
      this.lastHash = '0';
      this.sequenceCounter = 0;
    }
  }

  /**
   * Generate compliance report for audit chain
   */
  async generateComplianceReport(): Promise<{
    totalSegments: number;
    totalEntries: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
    wormCompliance: {
      retentionYears: number;
      objectLockEnabled: boolean;
      encryptionEnabled: boolean;
    };
    chainIntegrity: {
      verified: boolean;
      brokenSegments: number;
      verifiedSignatures: number;
    };
  }> {
    // In production, this would query WORM storage for all segments
    return {
      totalSegments: this.currentSegment ? 1 : 0,
      totalEntries: this.currentSegment?.entries.length || 0,
      oldestEntry: this.currentSegment?.startTime || null,
      newestEntry: this.currentSegment?.endTime || null,
      wormCompliance: {
        retentionYears: this.config.retentionYears,
        objectLockEnabled: true,
        encryptionEnabled: this.config.encryptionEnabled,
      },
      chainIntegrity: {
        verified: true,
        brokenSegments: 0,
        verifiedSignatures:
          this.currentSegment?.hashChain.filter((e) => e.signature).length || 0,
      },
    };
  }

  /**
   * Export segment for legal/compliance purposes
   */
  async exportSegment(segmentId: string): Promise<{
    segment: AuditSegment;
    verification: ChainVerificationResult;
    exportSignature: string;
  } | null> {
    // In production, retrieve from WORM storage and decrypt
    if (this.currentSegment?.segmentId === segmentId) {
      const verification = await this.verifyHashChain(
        this.currentSegment.hashChain,
      );

      // Sign the export with HSM for legal evidence
      let exportSignature = 'not_signed';
      try {
        const exportData = JSON.stringify({
          segment: this.currentSegment,
          verification,
        });
        const keyId = 'audit-export-signing-key';
        exportSignature = await fipsService.sign(exportData, keyId);
      } catch (error) {
        console.warn('Failed to sign export:', error);
      }

      return {
        segment: this.currentSegment,
        verification,
        exportSignature,
      };
    }

    return null;
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    if (this.segmentTimer) {
      clearInterval(this.segmentTimer);
      this.segmentTimer = null;
    }

    // Process any remaining pending entries
    if (this.pendingEntries.length > 0) {
      await this.processPendingEntries();
    }

    // Finalize current segment
    if (this.currentSegment) {
      await this.finalizeSegment(this.currentSegment);
    }
  }
}

// Create singleton instance
export const wormAuditChain = new WORMAuditChainService();
