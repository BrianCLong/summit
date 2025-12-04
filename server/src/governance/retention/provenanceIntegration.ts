import crypto from 'crypto';
import pino from 'pino';
import { Pool } from 'pg';
import {
  createProvenanceChain,
  ProvenanceChain,
  ProvenanceTransform,
  hashTransform,
} from '../../canonical/provenance.js';
import { RTBFJob, StorageSystem } from './types.js';

/**
 * Provenance Tombstone
 *
 * A cryptographic record that proves data existed and was deleted/redacted
 * according to a legal RTBF request, without revealing the original data.
 */
export interface ProvenanceTombstone {
  id: string;
  resourceType: 'entity' | 'relationship' | 'record';
  resourceId: string;
  storageSystem: StorageSystem;

  /** Operation that created this tombstone */
  operation: {
    type: 'deletion' | 'redaction' | 'anonymization';
    requestId: string;
    jobId: string;
    executedAt: Date;
    executedBy: string;
  };

  /** Cryptographic proof */
  proof: {
    /** Hash of original data (one-way) */
    contentHash: string;

    /** Hash of all field names (proves structure existed) */
    schemaHash: string;

    /** Merkle root of field hashes (if fields were redacted individually) */
    fieldsMerkleRoot?: string;

    /** Signature of tombstone */
    signature: string;
  };

  /** Legal justification */
  justification: {
    legalBasis: string;
    jurisdiction?: string;
    reason: string;
    requestTimestamp: Date;
  };

  /** Provenance chain reference */
  provenanceChainId?: string;

  /** Retention period for tombstone itself */
  retainUntil?: Date;

  createdAt: Date;
}

/**
 * Hash Stub
 *
 * A minimal record that allows verification that a specific value
 * existed at a specific time, without revealing the value.
 */
export interface HashStub {
  id: string;
  fieldName: string;
  fieldPath: string; // e.g., "user.profile.email"
  valueHash: string; // One-way hash of the value
  valueType: string; // e.g., "string", "number"
  resourceId: string;
  storageSystem: StorageSystem;
  operation: {
    type: 'redaction' | 'deletion';
    requestId: string;
    jobId: string;
    executedAt: Date;
  };
  createdAt: Date;
}

/**
 * Provenance Integration Service
 *
 * Creates and manages tombstones and hash stubs to maintain
 * cryptographic evidence of deleted/redacted data for compliance.
 */
export class ProvenanceIntegration {
  private readonly logger = pino({ name: 'provenance-integration' });
  private readonly pool: Pool;
  private readonly signingKey: string;

  constructor(options: { pool: Pool; signingKey?: string }) {
    this.pool = options.pool;
    this.signingKey = options.signingKey ?? process.env.TOMBSTONE_SIGNING_KEY ?? 'default-dev-key';
  }

  /**
   * Create tombstone for deleted record
   */
  async createTombstone(options: {
    resourceType: ProvenanceTombstone['resourceType'];
    resourceId: string;
    storageSystem: StorageSystem;
    originalData: Record<string, any>;
    requestId: string;
    jobId: string;
    executedBy: string;
    legalBasis: string;
    jurisdiction?: string;
    reason: string;
  }): Promise<ProvenanceTombstone> {
    const now = new Date();

    // Compute cryptographic proofs
    const contentHash = this.hashData(options.originalData);
    const schemaHash = this.hashSchema(options.originalData);
    const fieldHashes = this.computeFieldHashes(options.originalData);
    const fieldsMerkleRoot = this.computeMerkleRoot(fieldHashes);

    const tombstone: Omit<ProvenanceTombstone, 'proof'> = {
      id: crypto.randomUUID(),
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      storageSystem: options.storageSystem,
      operation: {
        type: 'deletion',
        requestId: options.requestId,
        jobId: options.jobId,
        executedAt: now,
        executedBy: options.executedBy,
      },
      justification: {
        legalBasis: options.legalBasis,
        jurisdiction: options.jurisdiction,
        reason: options.reason,
        requestTimestamp: now,
      },
      createdAt: now,
    };

    // Sign the tombstone
    const signature = this.signTombstone(tombstone, {
      contentHash,
      schemaHash,
      fieldsMerkleRoot,
    });

    const fullTombstone: ProvenanceTombstone = {
      ...tombstone,
      proof: {
        contentHash,
        schemaHash,
        fieldsMerkleRoot,
        signature,
      },
    };

    // Persist tombstone
    await this.persistTombstone(fullTombstone);

    this.logger.info(
      {
        tombstoneId: fullTombstone.id,
        resourceId: options.resourceId,
        requestId: options.requestId,
      },
      'Created provenance tombstone',
    );

    return fullTombstone;
  }

  /**
   * Create hash stub for redacted field
   */
  async createHashStub(options: {
    fieldName: string;
    fieldPath: string;
    value: any;
    valueType: string;
    resourceId: string;
    storageSystem: StorageSystem;
    requestId: string;
    jobId: string;
    operationType: 'redaction' | 'deletion';
  }): Promise<HashStub> {
    const now = new Date();

    const hashStub: HashStub = {
      id: crypto.randomUUID(),
      fieldName: options.fieldName,
      fieldPath: options.fieldPath,
      valueHash: this.hashValue(options.value),
      valueType: options.valueType,
      resourceId: options.resourceId,
      storageSystem: options.storageSystem,
      operation: {
        type: options.operationType,
        requestId: options.requestId,
        jobId: options.jobId,
        executedAt: now,
      },
      createdAt: now,
    };

    await this.persistHashStub(hashStub);

    this.logger.debug(
      {
        stubId: hashStub.id,
        fieldPath: options.fieldPath,
        resourceId: options.resourceId,
      },
      'Created hash stub',
    );

    return hashStub;
  }

  /**
   * Create provenance chain for RTBF operation
   */
  async createRTBFProvenanceChain(options: {
    job: RTBFJob;
    recordsBefore: Array<{ id: string; data: Record<string, any> }>;
    recordsAfter: Array<{ id: string; data: Record<string, any> }>;
    executedBy: string;
  }): Promise<ProvenanceChain> {
    const now = new Date();

    // Create transform describing the RTBF operation
    const transform: Omit<ProvenanceTransform, 'transformHash'> = {
      transformId: crypto.randomUUID(),
      transformType: options.job.operation.type,
      algorithm: 'rtbf-orchestrator-v1',
      algorithmVersion: '1.0.0',
      inputs: options.recordsBefore.map((r) => r.id),
      parameters: {
        requestId: options.job.requestId,
        jobId: options.job.id,
        storageSystem: options.job.storageSystem,
        targets: options.job.operation.targets,
        executedBy: options.executedBy,
      },
      transformedAt: now,
      transformHash: '', // Will be computed by createProvenanceChain
    };

    // Create source from the original records
    const source = {
      sourceId: `rtbf-job-${options.job.id}`,
      sourceType: 'rtbf-deletion',
      retrievedAt: options.job.execution.startedAt ?? now,
      sourceMetadata: {
        jobId: options.job.id,
        requestId: options.job.requestId,
        recordCount: options.recordsBefore.length,
      },
      sourceContentHash: '', // Will be computed by createProvenanceChain
    };

    // Create assertions about the operation
    const assertions = [
      {
        assertionId: crypto.randomUUID(),
        claim: `RTBF ${options.job.operation.type} executed`,
        assertedBy: {
          type: 'system' as const,
          identifier: 'rtbf-orchestrator',
        },
        assertedAt: now,
        confidence: 1.0,
        evidence: [options.job.id],
        assertionHash: '', // Will be computed by createProvenanceChain
      },
      {
        assertionId: crypto.randomUUID(),
        claim: `Records processed: ${options.recordsBefore.length}`,
        assertedBy: {
          type: 'system' as const,
          identifier: 'rtbf-orchestrator',
        },
        assertedAt: now,
        confidence: 1.0,
        evidence: [options.job.id],
        assertionHash: '', // Will be computed by createProvenanceChain
      },
    ];

    const chain = createProvenanceChain(
      `rtbf-chain-${options.job.id}`,
      source,
      assertions,
      [transform],
    );

    // Persist chain
    await this.persistProvenanceChain(chain);

    this.logger.info(
      {
        chainId: chain.chainId,
        jobId: options.job.id,
        recordCount: options.recordsBefore.length,
      },
      'Created RTBF provenance chain',
    );

    return chain;
  }

  /**
   * Verify tombstone integrity
   */
  async verifyTombstone(
    tombstone: ProvenanceTombstone,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Verify signature
    const expectedSignature = this.signTombstone(
      {
        ...tombstone,
        proof: undefined as any,
      },
      {
        contentHash: tombstone.proof.contentHash,
        schemaHash: tombstone.proof.schemaHash,
        fieldsMerkleRoot: tombstone.proof.fieldsMerkleRoot,
      },
    );

    if (expectedSignature !== tombstone.proof.signature) {
      errors.push('Signature verification failed');
    }

    // Verify timestamps are reasonable
    if (tombstone.operation.executedAt > new Date()) {
      errors.push('Execution timestamp is in the future');
    }

    if (tombstone.createdAt > new Date()) {
      errors.push('Creation timestamp is in the future');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Query tombstones
   */
  async queryTombstones(filters: {
    resourceId?: string;
    requestId?: string;
    storageSystem?: StorageSystem;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ProvenanceTombstone[]> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.resourceId) {
      conditions.push(`resource_id = $${paramIndex++}`);
      params.push(filters.resourceId);
    }

    if (filters.requestId) {
      conditions.push(`operation->>'requestId' = $${paramIndex++}`);
      params.push(filters.requestId);
    }

    if (filters.storageSystem) {
      conditions.push(`storage_system = $${paramIndex++}`);
      params.push(filters.storageSystem);
    }

    if (filters.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(filters.endDate);
    }

    try {
      const result = await this.pool.query(
        `SELECT * FROM provenance_tombstones WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 100`,
        params,
      );

      return result.rows.map((row) => this.rowToTombstone(row));
    } catch (error: any) {
      if (error.code === '42P01') {
        this.logger.debug('Provenance tombstones table does not exist');
        return [];
      }
      throw error;
    }
  }

  /**
   * Hash data content
   */
  private hashData(data: Record<string, any>): string {
    const content = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Hash data schema (field names only)
   */
  private hashSchema(data: Record<string, any>): string {
    const schema = Object.keys(data).sort();
    return crypto.createHash('sha256').update(JSON.stringify(schema)).digest('hex');
  }

  /**
   * Hash a single value
   */
  private hashValue(value: any): string {
    const content = JSON.stringify(value);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Compute hashes for all fields
   */
  private computeFieldHashes(data: Record<string, any>): string[] {
    return Object.entries(data)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => {
        const content = JSON.stringify({ field: key, value });
        return crypto.createHash('sha256').update(content).digest('hex');
      });
  }

  /**
   * Compute Merkle root from field hashes
   */
  private computeMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) {
      return crypto.createHash('sha256').update('').digest('hex');
    }

    if (hashes.length === 1) {
      return hashes[0];
    }

    // Build Merkle tree bottom-up
    let currentLevel = hashes;
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        const combined = left + right;
        const hash = crypto.createHash('sha256').update(combined).digest('hex');
        nextLevel.push(hash);
      }
      currentLevel = nextLevel;
    }

    return currentLevel[0];
  }

  /**
   * Sign tombstone
   */
  private signTombstone(
    tombstone: Omit<ProvenanceTombstone, 'proof'>,
    proof: {
      contentHash: string;
      schemaHash: string;
      fieldsMerkleRoot?: string;
    },
  ): string {
    const content = JSON.stringify({
      id: tombstone.id,
      resourceType: tombstone.resourceType,
      resourceId: tombstone.resourceId,
      storageSystem: tombstone.storageSystem,
      operation: tombstone.operation,
      justification: tombstone.justification,
      contentHash: proof.contentHash,
      schemaHash: proof.schemaHash,
      fieldsMerkleRoot: proof.fieldsMerkleRoot,
    });

    return crypto
      .createHmac('sha256', this.signingKey)
      .update(content)
      .digest('hex');
  }

  /**
   * Persist tombstone to database
   */
  private async persistTombstone(
    tombstone: ProvenanceTombstone,
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO provenance_tombstones (
          id, resource_type, resource_id, storage_system,
          operation, proof, justification, provenance_chain_id,
          retain_until, created_at
        ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9, $10)`,
        [
          tombstone.id,
          tombstone.resourceType,
          tombstone.resourceId,
          tombstone.storageSystem,
          JSON.stringify(tombstone.operation),
          JSON.stringify(tombstone.proof),
          JSON.stringify(tombstone.justification),
          tombstone.provenanceChainId,
          tombstone.retainUntil,
          tombstone.createdAt,
        ],
      );
    } catch (error: any) {
      if (error.code !== '42P01') {
        throw error;
      }
      this.logger.debug('Provenance tombstones table does not exist');
    }
  }

  /**
   * Persist hash stub to database
   */
  private async persistHashStub(stub: HashStub): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO hash_stubs (
          id, field_name, field_path, value_hash, value_type,
          resource_id, storage_system, operation, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)`,
        [
          stub.id,
          stub.fieldName,
          stub.fieldPath,
          stub.valueHash,
          stub.valueType,
          stub.resourceId,
          stub.storageSystem,
          JSON.stringify(stub.operation),
          stub.createdAt,
        ],
      );
    } catch (error: any) {
      if (error.code !== '42P01') {
        throw error;
      }
      this.logger.debug('Hash stubs table does not exist');
    }
  }

  /**
   * Persist provenance chain to database
   */
  private async persistProvenanceChain(chain: ProvenanceChain): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO provenance_chains (
          chain_id, source, assertions, transforms, chain_hash, created_at
        ) VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5, $6)`,
        [
          chain.chainId,
          JSON.stringify(chain.source),
          JSON.stringify(chain.assertions),
          JSON.stringify(chain.transforms),
          chain.chainHash,
          chain.createdAt,
        ],
      );
    } catch (error: any) {
      if (error.code !== '42P01') {
        throw error;
      }
      this.logger.debug('Provenance chains table does not exist');
    }
  }

  /**
   * Convert database row to tombstone object
   */
  private rowToTombstone(row: any): ProvenanceTombstone {
    return {
      id: row.id,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      storageSystem: row.storage_system,
      operation: row.operation,
      proof: row.proof,
      justification: row.justification,
      provenanceChainId: row.provenance_chain_id,
      retainUntil: row.retain_until,
      createdAt: row.created_at,
    };
  }
}
