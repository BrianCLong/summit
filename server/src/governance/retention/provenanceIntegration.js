"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvenanceIntegration = void 0;
const crypto_1 = __importDefault(require("crypto"));
const pino_1 = __importDefault(require("pino"));
const provenance_js_1 = require("../../canonical/provenance.js");
/**
 * Provenance Integration Service
 *
 * Creates and manages tombstones and hash stubs to maintain
 * cryptographic evidence of deleted/redacted data for compliance.
 */
class ProvenanceIntegration {
    logger = pino_1.default({ name: 'provenance-integration' });
    pool;
    signingKey;
    constructor(options) {
        this.pool = options.pool;
        this.signingKey = options.signingKey ?? process.env.TOMBSTONE_SIGNING_KEY ?? 'default-dev-key';
    }
    /**
     * Create tombstone for deleted record
     */
    async createTombstone(options) {
        const now = new Date();
        // Compute cryptographic proofs
        const contentHash = this.hashData(options.originalData);
        const schemaHash = this.hashSchema(options.originalData);
        const fieldHashes = this.computeFieldHashes(options.originalData);
        const fieldsMerkleRoot = this.computeMerkleRoot(fieldHashes);
        const tombstone = {
            id: crypto_1.default.randomUUID(),
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
        const fullTombstone = {
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
        this.logger.info({
            tombstoneId: fullTombstone.id,
            resourceId: options.resourceId,
            requestId: options.requestId,
        }, 'Created provenance tombstone');
        return fullTombstone;
    }
    /**
     * Create hash stub for redacted field
     */
    async createHashStub(options) {
        const now = new Date();
        const hashStub = {
            id: crypto_1.default.randomUUID(),
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
        this.logger.debug({
            stubId: hashStub.id,
            fieldPath: options.fieldPath,
            resourceId: options.resourceId,
        }, 'Created hash stub');
        return hashStub;
    }
    /**
     * Create provenance chain for RTBF operation
     */
    async createRTBFProvenanceChain(options) {
        const now = new Date();
        // Create transform describing the RTBF operation
        const transform = {
            transformId: crypto_1.default.randomUUID(),
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
                assertionId: crypto_1.default.randomUUID(),
                claim: `RTBF ${options.job.operation.type} executed`,
                assertedBy: {
                    type: 'system',
                    identifier: 'rtbf-orchestrator',
                },
                assertedAt: now,
                confidence: 1.0,
                evidence: [options.job.id],
                assertionHash: '', // Will be computed by createProvenanceChain
            },
            {
                assertionId: crypto_1.default.randomUUID(),
                claim: `Records processed: ${options.recordsBefore.length}`,
                assertedBy: {
                    type: 'system',
                    identifier: 'rtbf-orchestrator',
                },
                assertedAt: now,
                confidence: 1.0,
                evidence: [options.job.id],
                assertionHash: '', // Will be computed by createProvenanceChain
            },
        ];
        const chain = (0, provenance_js_1.createProvenanceChain)(`rtbf-chain-${options.job.id}`, source, assertions, [transform]);
        // Persist chain
        await this.persistProvenanceChain(chain);
        this.logger.info({
            chainId: chain.chainId,
            jobId: options.job.id,
            recordCount: options.recordsBefore.length,
        }, 'Created RTBF provenance chain');
        return chain;
    }
    /**
     * Verify tombstone integrity
     */
    async verifyTombstone(tombstone) {
        const errors = [];
        // Verify signature
        const { proof, ...tombstoneWithoutProof } = tombstone;
        const expectedSignature = this.signTombstone(tombstoneWithoutProof, {
            contentHash: tombstone.proof.contentHash,
            schemaHash: tombstone.proof.schemaHash,
            fieldsMerkleRoot: tombstone.proof.fieldsMerkleRoot,
        });
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
    async queryTombstones(filters) {
        const conditions = ['1=1'];
        const params = [];
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
            const result = await this.pool.query(`SELECT * FROM provenance_tombstones WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 100`, params);
            return result.rows.map((row) => this.rowToTombstone(row));
        }
        catch (error) {
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
    hashData(data) {
        const content = JSON.stringify(data, Object.keys(data).sort());
        return crypto_1.default.createHash('sha256').update(content).digest('hex');
    }
    /**
     * Hash data schema (field names only)
     */
    hashSchema(data) {
        const schema = Object.keys(data).sort();
        return crypto_1.default.createHash('sha256').update(JSON.stringify(schema)).digest('hex');
    }
    /**
     * Hash a single value
     */
    hashValue(value) {
        const content = JSON.stringify(value);
        return crypto_1.default.createHash('sha256').update(content).digest('hex');
    }
    /**
     * Compute hashes for all fields
     */
    computeFieldHashes(data) {
        return Object.entries(data)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => {
            const content = JSON.stringify({ field: key, value });
            return crypto_1.default.createHash('sha256').update(content).digest('hex');
        });
    }
    /**
     * Compute Merkle root from field hashes
     */
    computeMerkleRoot(hashes) {
        if (hashes.length === 0) {
            return crypto_1.default.createHash('sha256').update('').digest('hex');
        }
        if (hashes.length === 1) {
            return hashes[0];
        }
        // Build Merkle tree bottom-up
        let currentLevel = hashes;
        while (currentLevel.length > 1) {
            const nextLevel = [];
            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
                const combined = left + right;
                const hash = crypto_1.default.createHash('sha256').update(combined).digest('hex');
                nextLevel.push(hash);
            }
            currentLevel = nextLevel;
        }
        return currentLevel[0];
    }
    /**
     * Sign tombstone
     */
    signTombstone(tombstone, proof) {
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
        return crypto_1.default
            .createHmac('sha256', this.signingKey)
            .update(content)
            .digest('hex');
    }
    /**
     * Persist tombstone to database
     */
    async persistTombstone(tombstone) {
        try {
            await this.pool.query(`INSERT INTO provenance_tombstones (
          id, resource_type, resource_id, storage_system,
          operation, proof, justification, provenance_chain_id,
          retain_until, created_at
        ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9, $10)`, [
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
            ]);
        }
        catch (error) {
            if (error.code !== '42P01') {
                throw error;
            }
            this.logger.debug('Provenance tombstones table does not exist');
        }
    }
    /**
     * Persist hash stub to database
     */
    async persistHashStub(stub) {
        try {
            await this.pool.query(`INSERT INTO hash_stubs (
          id, field_name, field_path, value_hash, value_type,
          resource_id, storage_system, operation, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)`, [
                stub.id,
                stub.fieldName,
                stub.fieldPath,
                stub.valueHash,
                stub.valueType,
                stub.resourceId,
                stub.storageSystem,
                JSON.stringify(stub.operation),
                stub.createdAt,
            ]);
        }
        catch (error) {
            if (error.code !== '42P01') {
                throw error;
            }
            this.logger.debug('Hash stubs table does not exist');
        }
    }
    /**
     * Persist provenance chain to database
     */
    async persistProvenanceChain(chain) {
        try {
            await this.pool.query(`INSERT INTO provenance_chains (
          chain_id, source, assertions, transforms, chain_hash, created_at
        ) VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5, $6)`, [
                chain.chainId,
                JSON.stringify(chain.source),
                JSON.stringify(chain.assertions),
                JSON.stringify(chain.transforms),
                chain.chainHash,
                chain.createdAt,
            ]);
        }
        catch (error) {
            if (error.code !== '42P01') {
                throw error;
            }
            this.logger.debug('Provenance chains table does not exist');
        }
    }
    /**
     * Convert database row to tombstone object
     */
    rowToTombstone(row) {
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
exports.ProvenanceIntegration = ProvenanceIntegration;
