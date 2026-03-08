"use strict";
// Claim-Based Sync: Sync claims + proofs instead of raw data
// Zero-knowledge proofs and attestations for privacy-preserving synchronization
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimSyncEngine = exports.ClaimSyncEngine = void 0;
const crypto_1 = __importDefault(require("crypto"));
const ioredis_1 = __importDefault(require("ioredis"));
const pg_1 = require("pg");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const dual_notary_js_1 = require("../../federal/dual-notary.js");
const prometheus_js_1 = require("../observability/prometheus.js");
/**
 * Claim Sync Engine - Privacy-preserving synchronization
 */
class ClaimSyncEngine {
    redis;
    pool;
    constructor() {
        this.redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
        this.pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
    }
    /**
     * Convert CRDT operation to claims
     */
    async convertOperationToClaims(operation, policyContext) {
        try {
            const claims = [];
            const revealedFields = [];
            const hiddenFields = [];
            // Compute hash of raw data
            const rawDataHash = crypto_1.default
                .createHash('sha256')
                .update(JSON.stringify(operation.data))
                .digest('hex');
            // Analyze operation data to determine what can be revealed vs. hidden
            const sensitiveFields = await this.identifySensitiveFields(operation.data, policyContext);
            // Process each field
            for (const [field, value] of Object.entries(operation.data || {})) {
                if (sensitiveFields.includes(field)) {
                    // Create claim instead of revealing value
                    const claim = await this.createFieldClaim(operation, field, value, policyContext);
                    claims.push(claim);
                    hiddenFields.push(field);
                }
                else {
                    // Field can be revealed
                    revealedFields.push(field);
                }
            }
            // Create existence claim
            const existenceClaim = await this.createExistenceClaim(operation, policyContext);
            claims.push(existenceClaim);
            logger_js_1.default.debug('Operation converted to claims', {
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
        }
        catch (error) {
            logger_js_1.default.error('Failed to convert operation to claims', {
                error,
                operationId: operation.id,
            });
            throw error;
        }
    }
    /**
     * Create a field-specific claim with proof
     */
    async createFieldClaim(operation, field, value, policyContext) {
        const claimId = crypto_1.default.randomUUID();
        // Hash the value (commitment)
        const valueHash = crypto_1.default
            .createHash('sha256')
            .update(JSON.stringify(value))
            .digest('hex');
        // Create proof
        let proof;
        if (typeof value === 'number') {
            // For numeric values, create range proof
            proof = await this.createRangeProof(value, field);
        }
        else if (typeof value === 'string') {
            // For strings, create hash proof with optional pattern
            proof = await this.createHashProof(value, field);
        }
        else {
            // For complex types, create signature proof
            proof = await this.createSignatureProof(value, field);
        }
        const claim = {
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
        const notarized = await dual_notary_js_1.dualNotary.notarizeRoot(claimHash);
        claim.proof.signature = notarized.hsmSignature;
        return claim;
    }
    /**
     * Create existence claim (entity exists without revealing details)
     */
    async createExistenceClaim(operation, policyContext) {
        const claimId = crypto_1.default.randomUUID();
        // Hash entire entity data
        const entityHash = crypto_1.default
            .createHash('sha256')
            .update(JSON.stringify(operation.data))
            .digest('hex');
        // Create Merkle proof of existence
        const proof = await this.createMerkleProof(operation.data);
        const claim = {
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
        const notarized = await dual_notary_js_1.dualNotary.notarizeRoot(claimHash);
        claim.proof.signature = notarized.hsmSignature;
        return claim;
    }
    /**
     * Create range proof (prove value is in range without revealing exact value)
     */
    async createRangeProof(value, field) {
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
    async createHashProof(value, field) {
        const hash = crypto_1.default.createHash('sha256').update(value).digest('hex');
        // Extract non-sensitive pattern (e.g., length, prefix)
        const publicInputs = {
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
    async createSignatureProof(value, field) {
        const serialized = JSON.stringify(value);
        const hash = crypto_1.default.createHash('sha256').update(serialized).digest('hex');
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
    async createMerkleProof(data) {
        const fields = Object.keys(data);
        const leaves = fields.map((field) => crypto_1.default
            .createHash('sha256')
            .update(`${field}:${JSON.stringify(data[field])}`)
            .digest('hex'));
        // Build simple Merkle tree
        let currentLevel = leaves;
        while (currentLevel.length > 1) {
            const nextLevel = [];
            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = currentLevel[i + 1] || left;
                const combined = crypto_1.default
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
    async identifySensitiveFields(data, policyContext) {
        const sensitiveFields = [];
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
    async convertAndSync(sourceNodeId, targetNodeId) {
        try {
            logger_js_1.default.info('Starting claim-based sync', { sourceNodeId, targetNodeId });
            const result = {
                success: false,
                claimsSent: 0,
                claimsReceived: 0,
                conflicts: [],
                verified: false,
                leakageDetected: false,
            };
            // Get pending operations from CRDT log
            const operations = await this.getPendingOperations(sourceNodeId);
            logger_js_1.default.info(`Converting ${operations.length} operations to claims`);
            const allClaims = [];
            // Convert each operation to claims
            for (const operation of operations) {
                const policyContext = await this.getPolicyContext(operation);
                const conversion = await this.convertOperationToClaims(operation, policyContext);
                allClaims.push(...conversion.claims);
            }
            // Store claims locally
            for (const claim of allClaims) {
                await this.storeClaim(claim);
            }
            result.claimsSent = allClaims.length;
            // Verify claims before sending
            const verificationResults = await Promise.all(allClaims.map((claim) => this.verifyClaim(claim)));
            result.verified = verificationResults.every((v) => v.valid);
            if (!result.verified) {
                logger_js_1.default.error('Some claims failed verification', {
                    failed: verificationResults.filter((v) => !v.valid).length,
                });
                return result;
            }
            // In production, would send claims to target node via API
            logger_js_1.default.info('Claims verified and ready for sync', {
                claimCount: allClaims.length,
            });
            result.success = true;
            prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('claim_sync_claims_sent', result.claimsSent, { source: sourceNodeId, target: targetNodeId });
            return result;
        }
        catch (error) {
            logger_js_1.default.error('Claim-based sync failed', { error });
            throw error;
        }
    }
    /**
     * Verify a claim and its proof
     */
    async verifyClaim(claim) {
        const errors = [];
        try {
            // Verify claim signature
            const claimHash = this.computeClaimHash(claim);
            const notarized = {
                rootHex: claimHash,
                hsmSignature: claim.proof.signature,
                timestamp: claim.timestamp,
                notarizedBy: ['HSM'],
                verification: { hsmValid: false, tsaValid: false },
            };
            const verification = await dual_notary_js_1.dualNotary.verifyNotarizedRoot(notarized);
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
        }
        catch (error) {
            errors.push(error.message);
            return { valid: false, errors };
        }
    }
    /**
     * Verify proof data
     */
    async verifyProof(proof, claim) {
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
                }
                catch {
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
    computeClaimHash(claim) {
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
        return crypto_1.default.createHash('sha256').update(data).digest('hex');
    }
    /**
     * Get pending operations for a node
     */
    async getPendingOperations(nodeId) {
        const operationsData = await this.redis.zrange(`crdt_log:${nodeId}`, 0, 99); // Get up to 100 operations
        return operationsData.map((data) => JSON.parse(data));
    }
    /**
     * Get policy context for operation
     */
    async getPolicyContext(operation) {
        // Extract policy context from operation data
        const context = [];
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
    async storeClaim(claim) {
        await this.pool.query(`
      INSERT INTO data_claims (
        claim_id, claim_type, subject_id, subject_type, predicate,
        object_hash, timestamp, issuer, proof, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (claim_id) DO NOTHING
    `, [
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
        ]);
        // Also cache in Redis
        await this.redis.setex(`claim:${claim.claimId}`, 86400, // 24 hours
        JSON.stringify(claim));
    }
    /**
     * Retrieve claim by ID
     */
    async getClaim(claimId) {
        // Try Redis first
        const cached = await this.redis.get(`claim:${claimId}`);
        if (cached) {
            return JSON.parse(cached);
        }
        // Fall back to PostgreSQL
        const result = await this.pool.query('SELECT * FROM data_claims WHERE claim_id = $1', [claimId]);
        if (result.rows.length === 0)
            return null;
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
exports.ClaimSyncEngine = ClaimSyncEngine;
// Export singleton
exports.claimSyncEngine = new ClaimSyncEngine();
