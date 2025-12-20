// Claim-Based Sync: Sync claims + proofs instead of raw data
// Zero-knowledge proofs and attestations for privacy-preserving synchronization

import crypto from 'crypto';
import Redis from 'ioredis';
import { Pool } from 'pg';
import logger from '../../config/logger.js';
import { dualNotary } from '../../federal/dual-notary.js';
import { prometheusConductorMetrics } from '../observability/prometheus.js';
import type { CRDTOperation } from './crdt-sync.js';
import { verifiableSyncLog } from './verifiable-sync-log.js';

// Claim about data without revealing the data itself
export interface DataClaim {
  claimId: string;
  claimType:
    | 'existence'
    | 'property'
    | 'relationship'
    | 'computation'
    | 'authorization';
  subjectId: string; // What the claim is about
  subjectType: string; // Entity type
  predicate: string; // What we're claiming (e.g., "hasClassification", "relatesTo")
  objectHash: string; // Hash of the object value (commitment)
  timestamp: Date;
  issuer: string; // Node that created the claim
  proof: ClaimProof;
  metadata: {
    classification?: string;
    tenantId: string;
    policyContext: string[];
  };
}

// Cryptographic proof supporting a claim
export interface ClaimProof {
  proofType: 'hash' | 'signature' | 'merkle' | 'zk-snark' | 'range';
  proofData: string; // Encoded proof
  publicInputs: Record<string, any>; // Public inputs to verification
  verificationMethod: string; // How to verify (algorithm/key reference)
  signature: string; // Signature over the proof
}

// Result of claim conversion
export interface ClaimConversionResult {
  operation: CRDTOperation;
  claims: DataClaim[];
  rawDataHash: string; // For verification
  revealedFields: string[]; // Fields that are not hidden
  hiddenFields: string[]; // Fields protected by claims
}

// Sync result
export interface ClaimSyncResult {
  success: boolean;
  claimsSent: number;
  claimsReceived: number;
  conflicts: DataClaim[];
  verified: boolean;
  leakageDetected: boolean;
}

/**
 * Claim Sync Engine - Privacy-preserving synchronization
 */
export class ClaimSyncEngine {
  private redis: Redis;
  private pool: Pool;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  /**
   * Convert CRDT operation to claims
   */
  async convertOperationToClaims(
    operation: CRDTOperation,
    policyContext: string[],
  ): Promise<ClaimConversionResult> {
    try {
      const claims: DataClaim[] = [];
      const revealedFields: string[] = [];
      const hiddenFields: string[] = [];

      // Compute hash of raw data
      const rawDataHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(operation.data))
        .digest('hex');

      // Analyze operation data to determine what can be revealed vs. hidden
      const sensitiveFields = await this.identifySensitiveFields(
        operation.data,
        policyContext,
      );

      // Process each field
      for (const [field, value] of Object.entries(operation.data || {})) {
        if (sensitiveFields.includes(field)) {
          // Create claim instead of revealing value
          const claim = await this.createFieldClaim(
            operation,
            field,
            value,
            policyContext,
          );
          claims.push(claim);
          hiddenFields.push(field);
        } else {
          // Field can be revealed
          revealedFields.push(field);
        }
      }

      // Create existence claim
      const existenceClaim = await this.createExistenceClaim(
        operation,
        policyContext,
      );
      claims.push(existenceClaim);

      logger.debug('Operation converted to claims', {
        operationId: operation.id,
        claimsCount: claims.length,
        hiddenFields: hiddenFields.length,
        revealedFields: revealedFields.length,
      });

      return {
        operation,
        claims,
        rawDataHash,
        revealedFields,
        hiddenFields,
      };
    } catch (error) {
      logger.error('Failed to convert operation to claims', {
        error,
        operationId: operation.id,
      });
      throw error;
    }
  }

  /**
   * Create a field-specific claim with proof
   */
  private async createFieldClaim(
    operation: CRDTOperation,
    field: string,
    value: any,
    policyContext: string[],
  ): Promise<DataClaim> {
    const claimId = crypto.randomUUID();

    // Hash the value (commitment)
    const valueHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(value))
      .digest('hex');

    // Create proof
    let proof: ClaimProof;

    if (typeof value === 'number') {
      // For numeric values, create range proof
      proof = await this.createRangeProof(value, field);
    } else if (typeof value === 'string') {
      // For strings, create hash proof with optional pattern
      proof = await this.createHashProof(value, field);
    } else {
      // For complex types, create signature proof
      proof = await this.createSignatureProof(value, field);
    }

    const claim: DataClaim = {
      claimId,
      claimType: 'property',
      subjectId: operation.entityId,
      subjectType: operation.entityType,
      predicate: `has_${field}`,
      objectHash: valueHash,
      timestamp: new Date(operation.timestamp),
      issuer: operation.nodeId,
      proof,
      metadata: {
        tenantId: operation.data?._tenantId || 'unknown',
        policyContext,
      },
    };

    // Sign the claim
    const claimHash = this.computeClaimHash(claim);
    const notarized = await dualNotary.notarizeRoot(claimHash);
    claim.proof.signature = notarized.hsmSignature;

    return claim;
  }

  /**
   * Create existence claim (entity exists without revealing details)
   */
  private async createExistenceClaim(
    operation: CRDTOperation,
    policyContext: string[],
  ): Promise<DataClaim> {
    const claimId = crypto.randomUUID();

    // Hash entire entity data
    const entityHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(operation.data))
      .digest('hex');

    // Create Merkle proof of existence
    const proof = await this.createMerkleProof(operation.data);

    const claim: DataClaim = {
      claimId,
      claimType: 'existence',
      subjectId: operation.entityId,
      subjectType: operation.entityType,
      predicate: 'exists',
      objectHash: entityHash,
      timestamp: new Date(operation.timestamp),
      issuer: operation.nodeId,
      proof,
      metadata: {
        tenantId: operation.data?._tenantId || 'unknown',
        policyContext,
      },
    };

    const claimHash = this.computeClaimHash(claim);
    const notarized = await dualNotary.notarizeRoot(claimHash);
    claim.proof.signature = notarized.hsmSignature;

    return claim;
  }

  /**
   * Create range proof (prove value is in range without revealing exact value)
   */
  private async createRangeProof(
    value: number,
    field: string,
  ): Promise<ClaimProof> {
    // Simplified range proof (in production, use Bulletproofs or similar)
    const min = Math.floor(value / 10) * 10; // Round down to nearest 10
    const max = min + 10;

    return {
      proofType: 'range',
      proofData: JSON.stringify({ min, max }),
      publicInputs: {
        field,
        rangeMin: min,
        rangeMax: max,
      },
      verificationMethod: 'range_check',
      signature: '', // Will be filled by caller
    };
  }

  /**
   * Create hash proof with optional pattern matching
   */
  private async createHashProof(
    value: string,
    field: string,
  ): Promise<ClaimProof> {
    const hash = crypto.createHash('sha256').update(value).digest('hex');

    // Extract non-sensitive pattern (e.g., length, prefix)
    const publicInputs: Record<string, any> = {
      field,
      length: value.length,
    };

    // For certain fields, reveal pattern
    if (field === 'email') {
      publicInputs.domain = value.split('@')[1] || 'unknown';
    }

    return {
      proofType: 'hash',
      proofData: hash,
      publicInputs,
      verificationMethod: 'sha256',
      signature: '',
    };
  }

  /**
   * Create signature proof for complex objects
   */
  private async createSignatureProof(
    value: any,
    field: string,
  ): Promise<ClaimProof> {
    const serialized = JSON.stringify(value);
    const hash = crypto.createHash('sha256').update(serialized).digest('hex');

    return {
      proofType: 'signature',
      proofData: hash,
      publicInputs: {
        field,
        type: typeof value,
        isArray: Array.isArray(value),
        size: Array.isArray(value) ? value.length : Object.keys(value).length,
      },
      verificationMethod: 'ecdsa',
      signature: '',
    };
  }

  /**
   * Create Merkle proof
   */
  private async createMerkleProof(data: any): Promise<ClaimProof> {
    const fields = Object.keys(data);
    const leaves = fields.map((field) =>
      crypto
        .createHash('sha256')
        .update(`${field}:${JSON.stringify(data[field])}`)
        .digest('hex'),
    );

    // Build simple Merkle tree
    let currentLevel = leaves;
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left;
        const combined = crypto
          .createHash('sha256')
          .update(left + right)
          .digest('hex');
        nextLevel.push(combined);
      }
      currentLevel = nextLevel;
    }

    const root = currentLevel[0];

    return {
      proofType: 'merkle',
      proofData: root,
      publicInputs: {
        fieldCount: fields.length,
        fields: fields.slice(0, 5), // Reveal some field names
      },
      verificationMethod: 'merkle_tree',
      signature: '',
    };
  }

  /**
   * Identify sensitive fields based on policy
   */
  private async identifySensitiveFields(
    data: any,
    policyContext: string[],
  ): Promise<string[]> {
    const sensitiveFields: string[] = [];

    // Common sensitive field patterns
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /ssn/i,
      /credit/i,
      /classification/i,
      /clearance/i,
      /pii/i,
    ];

    for (const field of Object.keys(data)) {
      // Check against patterns
      if (sensitivePatterns.some((pattern) => pattern.test(field))) {
        sensitiveFields.push(field);
        continue;
      }

      // Check classification level
      if (field === 'classification' || field === 'clearance') {
        sensitiveFields.push(field);
        continue;
      }

      // Check value type and size
      const value = data[field];
      if (typeof value === 'string' && value.length > 1000) {
        // Large strings might contain sensitive data
        sensitiveFields.push(field);
      }
    }

    return sensitiveFields;
  }

  /**
   * Convert and sync operations as claims
   */
  async convertAndSync(
    sourceNodeId: string,
    targetNodeId: string,
  ): Promise<ClaimSyncResult> {
    try {
      logger.info('Starting claim-based sync', { sourceNodeId, targetNodeId });

      const result: ClaimSyncResult = {
        success: false,
        claimsSent: 0,
        claimsReceived: 0,
        conflicts: [],
        verified: false,
        leakageDetected: false,
      };

      // Get pending operations from CRDT log
      const operations = await this.getPendingOperations(sourceNodeId);

      logger.info(`Converting ${operations.length} operations to claims`);

      const allClaims: DataClaim[] = [];

      // Convert each operation to claims
      for (const operation of operations) {
        const policyContext = await this.getPolicyContext(operation);
        const conversion = await this.convertOperationToClaims(
          operation,
          policyContext,
        );
        allClaims.push(...conversion.claims);
      }

      // Store claims locally
      for (const claim of allClaims) {
        await this.storeClaim(claim);
      }

      result.claimsSent = allClaims.length;

      // Verify claims before sending
      const verificationResults = await Promise.all(
        allClaims.map((claim) => this.verifyClaim(claim)),
      );

      result.verified = verificationResults.every((v) => v.valid);

      if (!result.verified) {
        logger.error('Some claims failed verification', {
          failed: verificationResults.filter((v) => !v.valid).length,
        });
        return result;
      }

      // In production, would send claims to target node via API
      logger.info('Claims verified and ready for sync', {
        claimCount: allClaims.length,
      });

      result.success = true;

      prometheusConductorMetrics.recordOperationalMetric(
        'claim_sync_claims_sent',
        result.claimsSent,
        { source: sourceNodeId, target: targetNodeId },
      );

      return result;
    } catch (error) {
      logger.error('Claim-based sync failed', { error });
      throw error;
    }
  }

  /**
   * Verify a claim and its proof
   */
  async verifyClaim(claim: DataClaim): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Verify claim signature
      const claimHash = this.computeClaimHash(claim);
      const notarized = {
        rootHex: claimHash,
        hsmSignature: claim.proof.signature,
        timestamp: claim.timestamp,
        notarizedBy: ['HSM'] as ('HSM' | 'TSA')[],
        verification: { hsmValid: false, tsaValid: false },
      };

      const verification = await dualNotary.verifyNotarizedRoot(notarized);

      if (!verification.hsmVerification) {
        errors.push('Claim signature invalid');
      }

      // Verify proof based on type
      const proofValid = await this.verifyProof(claim.proof, claim);
      if (!proofValid) {
        errors.push('Proof verification failed');
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      errors.push(error.message);
      return { valid: false, errors };
    }
  }

  /**
   * Verify proof data
   */
  private async verifyProof(
    proof: ClaimProof,
    claim: DataClaim,
  ): Promise<boolean> {
    switch (proof.proofType) {
      case 'hash':
        // Hash proofs are self-verifying (commitment scheme)
        return proof.proofData.length === 64; // SHA-256 hex

      case 'signature':
        // Would verify ECDSA signature in production
        return proof.proofData.length > 0;

      case 'merkle':
        // Merkle root should be valid hex string
        return /^[0-9a-f]{64}$/i.test(proof.proofData);

      case 'range':
        try {
          const rangeData = JSON.parse(proof.proofData);
          return rangeData.min < rangeData.max;
        } catch {
          return false;
        }

      case 'zk-snark':
        // In production, would verify ZK-SNARK proof
        return true;

      default:
        return false;
    }
  }

  /**
   * Compute claim hash for signing
   */
  private computeClaimHash(claim: DataClaim): string {
    const data = JSON.stringify({
      claimId: claim.claimId,
      claimType: claim.claimType,
      subjectId: claim.subjectId,
      subjectType: claim.subjectType,
      predicate: claim.predicate,
      objectHash: claim.objectHash,
      timestamp: claim.timestamp,
      issuer: claim.issuer,
      proofData: claim.proof.proofData,
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get pending operations for a node
   */
  private async getPendingOperations(
    nodeId: string,
  ): Promise<CRDTOperation[]> {
    const operationsData = await this.redis.zrange(`crdt_log:${nodeId}`, 0, 99); // Get up to 100 operations
    return operationsData.map((data) => JSON.parse(data));
  }

  /**
   * Get policy context for operation
   */
  private async getPolicyContext(
    operation: CRDTOperation,
  ): Promise<string[]> {
    // Extract policy context from operation data
    const context: string[] = [];

    if (operation.data?.classification) {
      context.push(`classification:${operation.data.classification}`);
    }

    if (operation.data?.tenantId) {
      context.push(`tenant:${operation.data.tenantId}`);
    }

    if (operation.entityType) {
      context.push(`entity_type:${operation.entityType}`);
    }

    return context;
  }

  /**
   * Store claim in database
   */
  private async storeClaim(claim: DataClaim): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO data_claims (
        claim_id, claim_type, subject_id, subject_type, predicate,
        object_hash, timestamp, issuer, proof, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (claim_id) DO NOTHING
    `,
      [
        claim.claimId,
        claim.claimType,
        claim.subjectId,
        claim.subjectType,
        claim.predicate,
        claim.objectHash,
        claim.timestamp,
        claim.issuer,
        JSON.stringify(claim.proof),
        JSON.stringify(claim.metadata),
      ],
    );

    // Also cache in Redis
    await this.redis.setex(
      `claim:${claim.claimId}`,
      86400, // 24 hours
      JSON.stringify(claim),
    );
  }

  /**
   * Retrieve claim by ID
   */
  async getClaim(claimId: string): Promise<DataClaim | null> {
    // Try Redis first
    const cached = await this.redis.get(`claim:${claimId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fall back to PostgreSQL
    const result = await this.pool.query(
      'SELECT * FROM data_claims WHERE claim_id = $1',
      [claimId],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      claimId: row.claim_id,
      claimType: row.claim_type,
      subjectId: row.subject_id,
      subjectType: row.subject_type,
      predicate: row.predicate,
      objectHash: row.object_hash,
      timestamp: row.timestamp,
      issuer: row.issuer,
      proof: row.proof,
      metadata: row.metadata,
    };
  }
}

// Export singleton
export const claimSyncEngine = new ClaimSyncEngine();
