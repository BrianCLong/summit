// Maestro Conductor v24.4.0 - Provenance Ledger v2 with Hash-Chain
// Epic E18: Provenance Integrity & Crypto Evidence - Immutable audit trail

// No-op tracer shim to avoid OTEL dependency
import { Counter, Histogram, Gauge } from 'prom-client';
import { pool } from '../db/pg';
import { EventEmitter } from 'events';
import crypto from 'crypto';
import { execSync } from 'child_process';
import {
  CryptoPipeline,
  createDefaultCryptoPipeline,
  type SignatureBundle,
} from '../security/crypto/index.js';

const tracer = {
  startActiveSpan: async (
    _name: string,
    fn: (span: any) => Promise<any> | any,
  ) => {
    const span = {
      setAttributes: (_a?: any) => {},
      recordException: (_e?: any) => {},
      setStatus: (_s?: any) => {},
      end: () => {},
    };
    return await fn(span);
  },
};

// Metrics
const ledgerEntries = new Counter({
  name: 'provenance_ledger_entries_total',
  help: 'Total provenance ledger entries',
  labelNames: ['tenant_id', 'action_type', 'resource_type'],
});

const ledgerOperationTime = new Histogram({
  name: 'provenance_ledger_operation_duration_seconds',
  help: 'Provenance ledger operation duration',
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  labelNames: ['operation', 'batch_size'],
});

const ledgerChainHeight = new Gauge({
  name: 'provenance_ledger_chain_height',
  help: 'Current height of the provenance chain',
  labelNames: ['tenant_id'],
});

const ledgerIntegrityStatus = new Gauge({
  name: 'provenance_ledger_integrity_status',
  help: 'Provenance ledger integrity status (1 = valid, 0 = corrupted)',
  labelNames: ['tenant_id'],
});

export interface ProvenanceEntry {
  id: string;
  tenantId: string;
  sequenceNumber: bigint;
  previousHash: string;
  currentHash: string;
  timestamp: Date;
  actionType: string;
  resourceType: string;
  resourceId: string;
  actorId: string;
  actorType: 'user' | 'system' | 'api' | 'job';
  payload: Record<string, any>;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    requestId?: string;
    purpose?: string;
    classification?: string[];
  };
  signature?: string;
  attestation?: {
    policy: string;
    evidence: Record<string, any>;
    timestamp: Date;
  };
}

export interface LedgerRoot {
  id: string;
  tenantId: string;
  rootHash: string;
  startSequence: bigint;
  endSequence: bigint;
  entryCount: number;
  timestamp: Date;
  signature: string;
  cosignBundle?: string;
  merkleProof?: string[];
}

export interface LedgerVerification {
  valid: boolean;
  totalEntries: number;
  brokenChains: number;
  invalidHashes: number;
  missingEntries: number;
  lastVerifiedSequence: bigint;
  verificationTime: number;
  errors: Array<{
    sequenceNumber: bigint;
    error: string;
    severity: 'warning' | 'error' | 'critical';
  }>;
}

export class ProvenanceLedgerV2 extends EventEmitter {
  private readonly genesisHash =
    '0000000000000000000000000000000000000000000000000000000000000000';
  private rootSigningInterval: NodeJS.Timeout | null = null;
  private cryptoPipeline?: CryptoPipeline;
  private cryptoPipelineInit?: Promise<void>;

  constructor() {
    super();
    this.initializeTables();
    this.initializeCryptoPipeline();
    this.startRootSigning();
  }

  setCryptoPipeline(pipeline: CryptoPipeline | null): void {
    this.cryptoPipeline = pipeline ?? undefined;
    this.cryptoPipelineInit = Promise.resolve();
  }

  private initializeCryptoPipeline(): void {
    if (this.cryptoPipelineInit) return;
    this.cryptoPipelineInit = createDefaultCryptoPipeline({
      timestampingEndpointEnv: 'CRYPTO_TIMESTAMP_ENDPOINT',
      auditSubsystem: 'provenance-ledger',
      trustAnchorsEnv: 'CRYPTO_TRUST_ANCHORS',
    })
      .then((pipeline) => {
        this.cryptoPipeline = pipeline ?? undefined;
      })
      .catch((error) => {
        console.warn('Failed to initialize cryptographic pipeline', error);
        this.cryptoPipeline = undefined;
      });
  }

  private async ensureCryptoPipeline(): Promise<void> {
    this.initializeCryptoPipeline();
    try {
      await this.cryptoPipelineInit;
    } catch {
      // initialization already logged
    }
  }

  async appendEntry(
    entry: Omit<
      ProvenanceEntry,
      'id' | 'sequenceNumber' | 'previousHash' | 'currentHash'
    >,
  ): Promise<ProvenanceEntry> {
    return tracer.startActiveSpan(
      'provenance_ledger.append_entry',
      async (span: any) => {
        span.setAttributes?.({
          tenant_id: entry.tenantId,
          action_type: entry.actionType,
          resource_type: entry.resourceType,
          actor_type: entry.actorType,
        });

        const startTime = Date.now();

        try {
          const client = await pool.connect();

          try {
            await client.query('BEGIN');

            // Get the previous entry for hash chaining
            const previousEntry = await this.getLastEntry(
              entry.tenantId,
              client,
            );
            const previousHash = previousEntry?.currentHash || this.genesisHash;
            const sequenceNumber = previousEntry
              ? previousEntry.sequenceNumber + 1n
              : 1n;

            // Generate unique ID and current hash
            const id = `prov_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const currentHash = this.computeEntryHash({
              id,
              sequenceNumber,
              previousHash,
              ...entry,
            });

            // Create the complete entry
            const completeEntry: ProvenanceEntry = {
              id,
              sequenceNumber,
              previousHash,
              currentHash,
              ...entry,
            };

            // Insert into database
            const insertQuery = `
            INSERT INTO provenance_ledger_v2 (
              id, tenant_id, sequence_number, previous_hash, current_hash,
              timestamp, action_type, resource_type, resource_id,
              actor_id, actor_type, payload, metadata, signature, attestation
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
          `;

            const result = await client.query(insertQuery, [
              completeEntry.id,
              completeEntry.tenantId,
              completeEntry.sequenceNumber.toString(),
              completeEntry.previousHash,
              completeEntry.currentHash,
              completeEntry.timestamp,
              completeEntry.actionType,
              completeEntry.resourceType,
              completeEntry.resourceId,
              completeEntry.actorId,
              completeEntry.actorType,
              JSON.stringify(completeEntry.payload),
              JSON.stringify(completeEntry.metadata),
              completeEntry.signature,
              completeEntry.attestation
                ? JSON.stringify(completeEntry.attestation)
                : null,
            ]);

            await client.query('COMMIT');

            // Update metrics
            ledgerEntries.inc({
              tenant_id: entry.tenantId,
              action_type: entry.actionType,
              resource_type: entry.resourceType,
            });

            ledgerChainHeight.set(
              { tenant_id: entry.tenantId },
              Number(completeEntry.sequenceNumber),
            );

            ledgerOperationTime.observe(
              { operation: 'append', batch_size: '1' },
              (Date.now() - startTime) / 1000,
            );

            span.setAttributes?.({
              sequence_number: completeEntry.sequenceNumber.toString(),
              current_hash: completeEntry.currentHash.substring(0, 16),
              chain_height: Number(completeEntry.sequenceNumber),
            });

            this.emit('entryAppended', completeEntry);
            return completeEntry;
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          } finally {
            client.release();
          }
        } catch (error) {
          span.recordException?.(error as Error);
          span.setStatus?.({ message: (error as Error).message });
          throw error;
        } finally {
          span.end?.();
        }
      },
    );
  }

  async batchAppendEntries(
    entries: Array<
      Omit<
        ProvenanceEntry,
        'id' | 'sequenceNumber' | 'previousHash' | 'currentHash'
      >
    >,
  ): Promise<ProvenanceEntry[]> {
    return tracer.startActiveSpan(
      'provenance_ledger.batch_append',
      async (span: any) => {
        span.setAttributes?.({
          batch_size: entries.length,
          tenant_ids: [...new Set(entries.map((e) => e.tenantId))].join(','),
        });

        const startTime = Date.now();
        const results: ProvenanceEntry[] = [];

        try {
          const client = await pool.connect();

          try {
            await client.query('BEGIN');

            // Group entries by tenant for proper chaining
            const entriesByTenant = new Map<string, typeof entries>();
            for (const entry of entries) {
              if (!entriesByTenant.has(entry.tenantId)) {
                entriesByTenant.set(entry.tenantId, []);
              }
              entriesByTenant.get(entry.tenantId)!.push(entry);
            }

            // Process each tenant's entries in sequence
            for (const [tenantId, tenantEntries] of entriesByTenant) {
              let previousEntry = await this.getLastEntry(tenantId, client);

              for (const entry of tenantEntries) {
                const previousHash =
                  previousEntry?.currentHash || this.genesisHash;
                const sequenceNumber = previousEntry
                  ? previousEntry.sequenceNumber + 1n
                  : 1n;

                const id = `prov_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                const currentHash = this.computeEntryHash({
                  id,
                  sequenceNumber,
                  previousHash,
                  ...entry,
                });

                const completeEntry: ProvenanceEntry = {
                  id,
                  sequenceNumber,
                  previousHash,
                  currentHash,
                  ...entry,
                };

                // Insert entry
                const insertQuery = `
                INSERT INTO provenance_ledger_v2 (
                  id, tenant_id, sequence_number, previous_hash, current_hash,
                  timestamp, action_type, resource_type, resource_id,
                  actor_id, actor_type, payload, metadata, signature, attestation
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
              `;

                await client.query(insertQuery, [
                  completeEntry.id,
                  completeEntry.tenantId,
                  completeEntry.sequenceNumber.toString(),
                  completeEntry.previousHash,
                  completeEntry.currentHash,
                  completeEntry.timestamp,
                  completeEntry.actionType,
                  completeEntry.resourceType,
                  completeEntry.resourceId,
                  completeEntry.actorId,
                  completeEntry.actorType,
                  JSON.stringify(completeEntry.payload),
                  JSON.stringify(completeEntry.metadata),
                  completeEntry.signature,
                  completeEntry.attestation
                    ? JSON.stringify(completeEntry.attestation)
                    : null,
                ]);

                results.push(completeEntry);
                previousEntry = completeEntry;
              }
            }

            await client.query('COMMIT');

            // Update metrics
            for (const entry of results) {
              ledgerEntries.inc({
                tenant_id: entry.tenantId,
                action_type: entry.actionType,
                resource_type: entry.resourceType,
              });
            }

            ledgerOperationTime.observe(
              {
                operation: 'batch_append',
                batch_size: entries.length.toString(),
              },
              (Date.now() - startTime) / 1000,
            );

            span.setAttributes?.({
              entries_processed: results.length,
              execution_time_ms: Date.now() - startTime,
            });

            this.emit('batchAppended', results);
            return results;
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          } finally {
            client.release();
          }
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  private computeEntryHash(entry: Partial<ProvenanceEntry>): string {
    // Create deterministic hash from entry data
    const hashData = {
      id: entry.id,
      tenantId: entry.tenantId,
      sequenceNumber: entry.sequenceNumber?.toString(),
      previousHash: entry.previousHash,
      timestamp: entry.timestamp?.toISOString(),
      actionType: entry.actionType,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      actorId: entry.actorId,
      actorType: entry.actorType,
      payload: entry.payload,
      metadata: entry.metadata,
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(hashData, Object.keys(hashData).sort()))
      .digest('hex');
  }

  private async getLastEntry(
    tenantId: string,
    client?: any,
  ): Promise<ProvenanceEntry | null> {
    const queryClient = client || pool;

    const result = await queryClient.query(
      `SELECT * FROM provenance_ledger_v2 
       WHERE tenant_id = $1 
       ORDER BY sequence_number DESC 
       LIMIT 1`,
      [tenantId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEntry(result.rows[0]);
  }

  async verifyChainIntegrity(tenantId?: string): Promise<LedgerVerification> {
    return tracer.startActiveSpan(
      'provenance_ledger.verify_integrity',
      async (span: any) => {
        span.setAttributes?.({
          tenant_id: tenantId || 'all',
        });

        const startTime = Date.now();
        const verification: LedgerVerification = {
          valid: true,
          totalEntries: 0,
          brokenChains: 0,
          invalidHashes: 0,
          missingEntries: 0,
          lastVerifiedSequence: 0n,
          verificationTime: 0,
          errors: [],
        };

        try {
          const query = `
          SELECT * FROM provenance_ledger_v2 
          ${tenantId ? 'WHERE tenant_id = $1' : ''}
          ORDER BY tenant_id, sequence_number
        `;

          const result = tenantId
            ? await pool.query(query, [tenantId])
            : await pool.query(query);

          verification.totalEntries = result.rows.length;

          let currentTenantId = '';
          let expectedSequence = 1n;
          let previousHash = this.genesisHash;

          for (const row of result.rows) {
            const entry = this.mapRowToEntry(row);

            // Reset for new tenant
            if (entry.tenantId !== currentTenantId) {
              currentTenantId = entry.tenantId;
              expectedSequence = 1n;
              previousHash = this.genesisHash;
            }

            // Check sequence continuity
            if (entry.sequenceNumber !== expectedSequence) {
              verification.missingEntries++;
              verification.errors.push({
                sequenceNumber: entry.sequenceNumber,
                error: `Expected sequence ${expectedSequence}, got ${entry.sequenceNumber}`,
                severity: 'critical',
              });
              verification.valid = false;
            }

            // Check hash chain
            if (entry.previousHash !== previousHash) {
              verification.brokenChains++;
              verification.errors.push({
                sequenceNumber: entry.sequenceNumber,
                error: `Hash chain broken: expected previous ${previousHash}, got ${entry.previousHash}`,
                severity: 'critical',
              });
              verification.valid = false;
            }

            // Verify current hash
            const computedHash = this.computeEntryHash(entry);
            if (entry.currentHash !== computedHash) {
              verification.invalidHashes++;
              verification.errors.push({
                sequenceNumber: entry.sequenceNumber,
                error: `Invalid hash: expected ${computedHash}, got ${entry.currentHash}`,
                severity: 'critical',
              });
              verification.valid = false;
            }

            expectedSequence = entry.sequenceNumber + 1n;
            previousHash = entry.currentHash;
            verification.lastVerifiedSequence = entry.sequenceNumber;
          }

          verification.verificationTime = Date.now() - startTime;

          // Update integrity status metric
          const status = verification.valid ? 1 : 0;
          if (tenantId) {
            ledgerIntegrityStatus.set({ tenant_id: tenantId }, status);
          }

          span.setAttributes?.({
            entries_verified: verification.totalEntries,
            chain_valid: verification.valid,
            broken_chains: verification.brokenChains,
            invalid_hashes: verification.invalidHashes,
            verification_time_ms: verification.verificationTime,
          });

          this.emit('chainVerified', { tenantId, verification });
          return verification;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  async createSignedRoot(tenantId?: string): Promise<LedgerRoot[]> {
    return tracer.startActiveSpan(
      'provenance_ledger.create_signed_root',
      async (span: any) => {
        span.setAttributes?.({
          tenant_id: tenantId || 'all',
        });

        try {
          const roots: LedgerRoot[] = [];

          // Get tenant list
          const tenants = tenantId ? [tenantId] : await this.getTenantList();

          for (const tid of tenants) {
            const root = await this.createTenantSignedRoot(tid);
            roots.push(root);
          }

          span.setAttributes?.({
            roots_created: roots.length,
            tenant_count: tenants.length,
          });

          this.emit('rootsSigned', roots);
          return roots;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  private async createTenantSignedRoot(tenantId: string): Promise<LedgerRoot> {
    // Get the range of entries for this root
    const rangeQuery = `
      SELECT 
        MIN(sequence_number) as start_seq,
        MAX(sequence_number) as end_seq,
        COUNT(*) as entry_count
      FROM provenance_ledger_v2 
      WHERE tenant_id = $1
      AND NOT EXISTS (
        SELECT 1 FROM provenance_ledger_roots 
        WHERE tenant_id = $1 
        AND end_sequence >= provenance_ledger_v2.sequence_number
      )
    `;

    const rangeResult = await pool.query(rangeQuery, [tenantId]);
    const range = rangeResult.rows[0];

    if (!range.start_seq) {
      throw new Error(`No new entries found for tenant ${tenantId}`);
    }

    // Compute Merkle root hash
    const entriesQuery = `
      SELECT current_hash FROM provenance_ledger_v2
      WHERE tenant_id = $1 
      AND sequence_number BETWEEN $2 AND $3
      ORDER BY sequence_number
    `;

    const entriesResult = await pool.query(entriesQuery, [
      tenantId,
      range.start_seq,
      range.end_seq,
    ]);
    const hashes = entriesResult.rows.map((row) => row.current_hash);
    const rootHash = this.computeMerkleRoot(hashes);

    // Sign the root hash using cosign
    const signature = await this.signWithCosign(rootHash);

    const root: LedgerRoot = {
      id: `root_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      tenantId,
      rootHash,
      startSequence: BigInt(range.start_seq),
      endSequence: BigInt(range.end_seq),
      entryCount: parseInt(range.entry_count),
      timestamp: new Date(),
      signature,
      merkleProof: this.generateMerkleProof(hashes, rootHash),
    };

    // Store the signed root
    await pool.query(
      `
      INSERT INTO provenance_ledger_roots (
        id, tenant_id, root_hash, start_sequence, end_sequence,
        entry_count, timestamp, signature, cosign_bundle, merkle_proof
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
      [
        root.id,
        root.tenantId,
        root.rootHash,
        root.startSequence.toString(),
        root.endSequence.toString(),
        root.entryCount,
        root.timestamp,
        root.signature,
        root.cosignBundle,
        JSON.stringify(root.merkleProof),
      ],
    );

    return root;
  }

  private computeMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) return this.genesisHash;
    if (hashes.length === 1) return hashes[0];

    // Build Merkle tree bottom-up
    let currentLevel = hashes;

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        const combined = crypto
          .createHash('sha256')
          .update(left + right)
          .digest('hex');
        nextLevel.push(combined);
      }

      currentLevel = nextLevel;
    }

    return currentLevel[0];
  }

  private generateMerkleProof(hashes: string[], rootHash: string): string[] {
    // Generate Merkle proof for verification
    // This is a simplified implementation
    return hashes.slice(0, Math.min(10, hashes.length)); // Sample proof
  }

  private async signWithCosign(data: string): Promise<string> {
    await this.ensureCryptoPipeline();
    if (this.cryptoPipeline) {
      try {
        const keyId = process.env.LEDGER_SIGNING_KEY_ID || 'ledger-root';
        const bundle = await this.cryptoPipeline.signPayload(
          Buffer.from(data),
          keyId,
          {
            includeTimestamp: true,
            metadata: {
              subsystem: 'provenance-ledger',
            },
          },
        );
        return JSON.stringify(bundle);
      } catch (error) {
        console.warn(
          'Crypto pipeline signing failed, falling back to cosign/HMAC:',
          error,
        );
      }
    }

    try {
      // Use cosign to sign the data
      // This requires cosign to be installed and configured
      const tempFile = `/tmp/provenance_${Date.now()}.txt`;
      require('fs').writeFileSync(tempFile, data);

      const signCommand = `cosign sign-blob --bundle=/tmp/bundle.json ${tempFile}`;
      const signature = execSync(signCommand, { encoding: 'utf-8' });

      // Cleanup
      require('fs').unlinkSync(tempFile);

      return signature.trim();
    } catch (error) {
      console.warn('Cosign signing failed, using fallback signature:', error);
      // Fallback to HMAC signature
      return crypto
        .createHmac('sha256', process.env.LEDGER_SECRET || 'default-secret')
        .update(data)
        .digest('hex');
    }
  }

  async verifySignature(rootHash: string, signature: string): Promise<boolean> {
    await this.ensureCryptoPipeline();
    if (this.cryptoPipeline) {
      try {
        const maybeBundle = JSON.parse(signature) as SignatureBundle;
        if (maybeBundle?.signature && maybeBundle?.keyId) {
          const result = await this.cryptoPipeline.verifySignature(
            Buffer.from(rootHash),
            maybeBundle,
            {
              expectedKeyId: maybeBundle.keyId,
              payloadDescription: 'provenance-ledger-root',
            },
          );
          if (result.valid) {
            return true;
          }
        }
      } catch (error) {
        if (signature.trim().startsWith('{')) {
          console.warn(
            'Failed to verify cryptographic pipeline signature, falling back:',
            error,
          );
        }
        // Non-JSON signatures fall through to legacy verification
      }
    }

    try {
      // Verify cosign signature
      const tempFile = `/tmp/verify_${Date.now()}.txt`;
      const tempSig = `/tmp/verify_${Date.now()}.sig`;

      require('fs').writeFileSync(tempFile, rootHash);
      require('fs').writeFileSync(tempSig, signature);

      const verifyCommand = `cosign verify-blob --signature=${tempSig} ${tempFile}`;
      execSync(verifyCommand, { encoding: 'utf-8' });

      // Cleanup
      require('fs').unlinkSync(tempFile);
      require('fs').unlinkSync(tempSig);

      return true;
    } catch (error) {
      console.warn('Cosign verification failed, trying fallback:', error);

      // Fallback to HMAC verification
      const expectedSignature = crypto
        .createHmac('sha256', process.env.LEDGER_SECRET || 'default-secret')
        .update(rootHash)
        .digest('hex');

      return signature === expectedSignature;
    }
  }

  private async getTenantList(): Promise<string[]> {
    const result = await pool.query(
      'SELECT DISTINCT tenant_id FROM provenance_ledger_v2 ORDER BY tenant_id',
    );
    return result.rows.map((row) => row.tenant_id);
  }

  private mapRowToEntry(row: any): ProvenanceEntry {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      sequenceNumber: BigInt(row.sequence_number),
      previousHash: row.previous_hash,
      currentHash: row.current_hash,
      timestamp: row.timestamp,
      actionType: row.action_type,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      actorId: row.actor_id,
      actorType: row.actor_type,
      payload:
        typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      metadata:
        typeof row.metadata === 'string'
          ? JSON.parse(row.metadata)
          : row.metadata,
      signature: row.signature,
      attestation: row.attestation
        ? typeof row.attestation === 'string'
          ? JSON.parse(row.attestation)
          : row.attestation
        : undefined,
    };
  }

  private async initializeTables(): Promise<void> {
    // Tables will be created by migration
    // This is a placeholder for any runtime initialization
  }

  private startRootSigning(): void {
    // Sign roots daily at 2 AM UTC
    const dailySigningHour = 2;
    const now = new Date();
    const nextRun = new Date();
    nextRun.setUTCHours(dailySigningHour, 0, 0, 0);

    if (nextRun <= now) {
      nextRun.setUTCDate(nextRun.getUTCDate() + 1);
    }

    const msUntilNextRun = nextRun.getTime() - now.getTime();

    setTimeout(() => {
      this.performDailyRootSigning();

      // Set up daily interval
      this.rootSigningInterval = setInterval(
        () => {
          this.performDailyRootSigning();
        },
        24 * 60 * 60 * 1000,
      ); // 24 hours
    }, msUntilNextRun);
  }

  private async performDailyRootSigning(): Promise<void> {
    try {
      console.log('Performing daily root signing...');
      const roots = await this.createSignedRoot();
      console.log(`Signed ${roots.length} tenant roots`);

      this.emit('dailySigningCompleted', {
        timestamp: new Date(),
        rootCount: roots.length,
        roots,
      });
    } catch (error) {
      console.error('Daily root signing failed:', error);
      this.emit('dailySigningFailed', { error, timestamp: new Date() });
    }
  }

  async getEntries(
    tenantId: string,
    options: {
      fromSequence?: bigint;
      toSequence?: bigint;
      limit?: number;
      actionType?: string;
      resourceType?: string;
    } = {},
  ): Promise<ProvenanceEntry[]> {
    const whereConditions = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (options.fromSequence !== undefined) {
      whereConditions.push(`sequence_number >= $${paramIndex}`);
      params.push(options.fromSequence.toString());
      paramIndex++;
    }

    if (options.toSequence !== undefined) {
      whereConditions.push(`sequence_number <= $${paramIndex}`);
      params.push(options.toSequence.toString());
      paramIndex++;
    }

    if (options.actionType) {
      whereConditions.push(`action_type = $${paramIndex}`);
      params.push(options.actionType);
      paramIndex++;
    }

    if (options.resourceType) {
      whereConditions.push(`resource_type = $${paramIndex}`);
      params.push(options.resourceType);
      paramIndex++;
    }

    const query = `
      SELECT * FROM provenance_ledger_v2
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY sequence_number
      ${options.limit ? `LIMIT ${options.limit}` : ''}
    `;

    const result = await pool.query(query, params);
    return result.rows.map((row) => this.mapRowToEntry(row));
  }

  async exportLedger(
    tenantId: string,
    format: 'json' | 'csv' = 'json',
  ): Promise<string> {
    const entries = await this.getEntries(tenantId);

    if (format === 'json') {
      return JSON.stringify(entries, null, 2);
    } else {
      // CSV format
      const headers = [
        'id',
        'sequence_number',
        'timestamp',
        'action_type',
        'resource_type',
        'resource_id',
        'actor_id',
        'actor_type',
        'current_hash',
      ];

      let csv = headers.join(',') + '\n';

      for (const entry of entries) {
        const row = headers.map((header) => {
          const value = (entry as any)[
            header === 'sequence_number'
              ? 'sequenceNumber'
              : header === 'action_type'
                ? 'actionType'
                : header === 'resource_type'
                  ? 'resourceType'
                  : header === 'resource_id'
                    ? 'resourceId'
                    : header === 'actor_id'
                      ? 'actorId'
                      : header === 'actor_type'
                        ? 'actorType'
                        : header === 'current_hash'
                          ? 'currentHash'
                          : header
          ];
          return typeof value === 'string'
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        });
        csv += row.join(',') + '\n';
      }

      return csv;
    }
  }

  cleanup(): void {
    if (this.rootSigningInterval) {
      clearInterval(this.rootSigningInterval);
      this.rootSigningInterval = null;
    }
  }
}

export const provenanceLedger = new ProvenanceLedgerV2();
