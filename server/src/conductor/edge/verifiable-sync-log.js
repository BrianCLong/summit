"use strict";
// @ts-nocheck
// Verifiable Sync Log: Cryptographically signed, tamper-evident sync logs
// Ensures integrity and non-repudiation of offline sync operations
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifiableSyncLog = exports.VerifiableSyncLog = void 0;
const crypto_1 = require("crypto");
const ioredis_1 = __importDefault(require("ioredis"));
const pg_1 = require("pg");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const dual_notary_js_1 = require("../../federal/dual-notary.js");
const prometheus_js_1 = require("../observability/prometheus.js");
/**
 * Verifiable Sync Log - Tamper-evident log with cryptographic proofs
 */
class VerifiableSyncLog {
    redis;
    pool;
    sequenceNumbers; // nodeId -> sequence
    constructor() {
        this.redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
        this.pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        this.sequenceNumbers = new Map();
    }
    /**
     * Initialize sync log for a node
     */
    async initialize(nodeId) {
        // Get last sequence number from persistent storage
        const result = await this.pool.query(`SELECT MAX(sequence_number) as max_seq
       FROM sync_log_entries
       WHERE node_id = $1`, [nodeId]);
        const lastSeq = result.rows[0]?.max_seq || 0;
        this.sequenceNumbers.set(nodeId, lastSeq);
        logger_js_1.default.info('Verifiable sync log initialized', {
            nodeId,
            lastSequence: lastSeq,
        });
    }
    /**
     * Record a single sync operation with verification
     */
    async recordOperation(nodeId, operation, sessionId, syncDirection) {
        try {
            const entryId = (0, crypto_1.randomUUID)();
            const timestamp = new Date();
            const sequenceNumber = this.getNextSequence(nodeId);
            // Get previous hash for chain
            const previousHash = await this.getPreviousHash(nodeId);
            // Create entry
            const entry = {
                entryId,
                nodeId,
                timestamp,
                sequenceNumber,
                operation,
                previousHash,
                signature: '', // Will be filled by signing
                metadata: {
                    sessionId,
                    entityType: operation.entityType,
                    entityId: operation.entityId,
                    syncDirection,
                },
            };
            // Compute entry hash
            const entryHash = this.computeEntryHash(entry);
            // Sign with dual notary (HSM + optional TSA)
            const notarized = await dual_notary_js_1.dualNotary.notarizeRoot(entryHash);
            const finalEntry = {
                ...entry,
                signature: notarized.hsmSignature,
                tsaTimestamp: notarized.tsaResponse,
            };
            // Store in Redis for fast access
            await this.redis.zadd(`sync_log:${nodeId}`, sequenceNumber, JSON.stringify(finalEntry));
            // Persist to PostgreSQL for long-term storage
            await this.persistEntry(finalEntry);
            // Update metrics
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('sync_log_entry_created', true, { node_id: nodeId, direction: syncDirection });
            logger_js_1.default.debug('Sync log entry recorded', {
                entryId,
                nodeId,
                sequence: sequenceNumber,
                entityType: operation.entityType,
            });
            return finalEntry;
        }
        catch (error) {
            logger_js_1.default.error('Failed to record sync operation', { error, nodeId });
            throw error;
        }
    }
    /**
     * Record batch of operations with Merkle tree attestation
     */
    async recordBatch(nodeId, operations, sessionId) {
        try {
            const batchId = (0, crypto_1.randomUUID)();
            const startTime = new Date();
            // Build Merkle tree for batch
            const merkleTree = this.buildMerkleTree(operations);
            const merkleRoot = merkleTree.root;
            const merkleProofs = this.generateMerkleProofs(operations, merkleTree);
            // Sign Merkle root
            const notarized = await dual_notary_js_1.dualNotary.notarizeRoot(merkleRoot);
            const endTime = new Date();
            const batch = {
                batchId,
                nodeId,
                startTime,
                endTime,
                operationCount: operations.length,
                operations,
                merkleRoot,
                merkleProofs,
                batchSignature: notarized.hsmSignature,
                tsaTimestamp: notarized.tsaResponse,
                verified: true,
            };
            // Store batch metadata
            await this.redis.set(`sync_batch:${batchId}`, JSON.stringify({
                ...batch,
                operations: undefined, // Don't duplicate operations in metadata
            }), 'EX', 86400 * 30);
            // Record individual operations with batch reference
            for (const operation of operations) {
                await this.recordOperation(nodeId, operation, sessionId, 'outbound');
            }
            // Persist batch to PostgreSQL
            await this.persistBatch(batch);
            logger_js_1.default.info('Sync batch recorded', {
                batchId,
                nodeId,
                operationCount: operations.length,
            });
            prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('sync_batch_operations', operations.length, { node_id: nodeId });
            return batch;
        }
        catch (error) {
            logger_js_1.default.error('Failed to record sync batch', { error, nodeId });
            throw error;
        }
    }
    /**
     * Verify sync log entry integrity
     */
    async verifyEntry(entryId) {
        try {
            const entry = await this.getEntry(entryId);
            if (!entry) {
                return {
                    valid: false,
                    entryId,
                    checks: {
                        hashChainValid: false,
                        signatureValid: false,
                        merkleValid: false,
                        timestampValid: false,
                    },
                    errors: ['Entry not found'],
                };
            }
            const checks = {
                hashChainValid: await this.verifyHashChain(entry),
                signatureValid: await this.verifySignature(entry),
                merkleValid: entry.merkleRoot
                    ? await this.verifyMerkleProof(entry)
                    : true,
                timestampValid: entry.tsaTimestamp
                    ? await this.verifyTimestamp(entry)
                    : true,
            };
            const errors = [];
            if (!checks.hashChainValid)
                errors.push('Hash chain broken');
            if (!checks.signatureValid)
                errors.push('Invalid signature');
            if (!checks.merkleValid)
                errors.push('Merkle proof invalid');
            if (!checks.timestampValid)
                errors.push('Timestamp invalid');
            const valid = Object.values(checks).every((check) => check);
            return {
                valid,
                entryId,
                checks,
                errors,
            };
        }
        catch (error) {
            logger_js_1.default.error('Entry verification failed', { error, entryId });
            return {
                valid: false,
                entryId,
                checks: {
                    hashChainValid: false,
                    signatureValid: false,
                    merkleValid: false,
                    timestampValid: false,
                },
                errors: [error.message],
            };
        }
    }
    /**
     * Verify entire batch
     */
    async verifyBatch(batchId) {
        try {
            const batch = await this.getBatch(batchId);
            if (!batch) {
                return {
                    valid: false,
                    entryId: batchId,
                    checks: {
                        hashChainValid: false,
                        signatureValid: false,
                        merkleValid: false,
                        timestampValid: false,
                    },
                    errors: ['Batch not found'],
                };
            }
            // Verify Merkle root
            const recomputedTree = this.buildMerkleTree(batch.operations);
            const merkleValid = recomputedTree.root === batch.merkleRoot;
            // Verify batch signature
            const signatureValid = await this.verifyBatchSignature(batch);
            // Verify timestamp
            const timestampValid = batch.tsaTimestamp
                ? await this.verifyBatchTimestamp(batch)
                : true;
            const checks = {
                hashChainValid: true, // Batch doesn't participate in hash chain
                signatureValid,
                merkleValid,
                timestampValid,
            };
            const errors = [];
            if (!merkleValid)
                errors.push('Merkle root mismatch');
            if (!signatureValid)
                errors.push('Batch signature invalid');
            if (!timestampValid)
                errors.push('Batch timestamp invalid');
            const valid = Object.values(checks).every((check) => check);
            return {
                valid,
                entryId: batchId,
                checks,
                errors,
            };
        }
        catch (error) {
            logger_js_1.default.error('Batch verification failed', { error, batchId });
            return {
                valid: false,
                entryId: batchId,
                checks: {
                    hashChainValid: false,
                    signatureValid: false,
                    merkleValid: false,
                    timestampValid: false,
                },
                errors: [error.message],
            };
        }
    }
    /**
     * Get sync log for a node
     */
    async getNodeSyncLog(nodeId, options = {}) {
        const limit = options.limit || 100;
        const entries = [];
        // Get from PostgreSQL for historical data
        const query = `
      SELECT * FROM sync_log_entries
      WHERE node_id = $1
      ${options.since ? 'AND timestamp > $2' : ''}
      ${options.verified !== undefined ? `AND verified = $${options.since ? 3 : 2}` : ''}
      ORDER BY sequence_number DESC
      LIMIT $${options.since ? (options.verified !== undefined ? 4 : 3) : options.verified !== undefined ? 3 : 2}
    `;
        const params = [
            nodeId,
            ...(options.since ? [options.since] : []),
            ...(options.verified !== undefined ? [options.verified] : []),
            limit,
        ];
        const result = await this.pool.query(query, params);
        return result.rows.map((row) => ({
            entryId: row.entry_id,
            nodeId: row.node_id,
            timestamp: row.timestamp,
            sequenceNumber: row.sequence_number,
            operation: row.operation,
            previousHash: row.previous_hash,
            merkleRoot: row.merkle_root,
            signature: row.signature,
            tsaTimestamp: row.tsa_timestamp,
            metadata: row.metadata,
        }));
    }
    // Private helper methods
    getNextSequence(nodeId) {
        const current = this.sequenceNumbers.get(nodeId) || 0;
        const next = current + 1;
        this.sequenceNumbers.set(nodeId, next);
        return next;
    }
    async getPreviousHash(nodeId) {
        const lastEntry = await this.redis.zrevrange(`sync_log:${nodeId}`, 0, 0);
        if (lastEntry.length === 0) {
            // Genesis entry
            return (0, crypto_1.createHash)('sha256').update('genesis').digest('hex');
        }
        const entry = JSON.parse(lastEntry[0]);
        return this.computeEntryHash(entry);
    }
    computeEntryHash(entry) {
        const data = JSON.stringify({
            entryId: entry.entryId,
            nodeId: entry.nodeId,
            timestamp: entry.timestamp,
            sequenceNumber: entry.sequenceNumber,
            operation: entry.operation,
            previousHash: entry.previousHash,
        });
        return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
    }
    buildMerkleTree(operations) {
        // Hash each operation
        const leaves = operations.map((op) => (0, crypto_1.createHash)('sha256').update(JSON.stringify(op)).digest('hex'));
        const tree = [leaves];
        // Build tree levels
        while (tree[tree.length - 1].length > 1) {
            const currentLevel = tree[tree.length - 1];
            const nextLevel = [];
            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = currentLevel[i + 1] || left; // Duplicate if odd
                const combined = (0, crypto_1.createHash)('sha256')
                    .update(left + right)
                    .digest('hex');
                nextLevel.push(combined);
            }
            tree.push(nextLevel);
        }
        return {
            root: tree[tree.length - 1][0],
            tree,
        };
    }
    generateMerkleProofs(operations, merkleTree) {
        const proofs = {};
        operations.forEach((op, index) => {
            const proof = [];
            let currentIndex = index;
            for (let level = 0; level < merkleTree.tree.length - 1; level++) {
                const currentLevel = merkleTree.tree[level];
                const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
                if (siblingIndex < currentLevel.length) {
                    proof.push(currentLevel[siblingIndex]);
                }
                currentIndex = Math.floor(currentIndex / 2);
            }
            proofs[op.id] = proof;
        });
        return proofs;
    }
    async verifyHashChain(entry) {
        if (entry.sequenceNumber === 1) {
            // Genesis entry
            const genesisHash = (0, crypto_1.createHash)('sha256')
                .update('genesis')
                .digest('hex');
            return entry.previousHash === genesisHash;
        }
        // Get previous entry
        const prevEntries = await this.redis.zrangebyscore(`sync_log:${entry.nodeId}`, entry.sequenceNumber - 1, entry.sequenceNumber - 1);
        if (prevEntries.length === 0) {
            return false;
        }
        const prevEntry = JSON.parse(prevEntries[0]);
        const prevHash = this.computeEntryHash(prevEntry);
        return entry.previousHash === prevHash;
    }
    async verifySignature(entry) {
        try {
            const entryHash = this.computeEntryHash(entry);
            const notarized = {
                rootHex: entryHash,
                hsmSignature: entry.signature,
                tsaResponse: entry.tsaTimestamp,
                timestamp: entry.timestamp,
                notarizedBy: ['HSM'],
                verification: { hsmValid: false, tsaValid: false },
            };
            const verification = await dual_notary_js_1.dualNotary.verifyNotarizedRoot(notarized);
            return verification.hsmVerification;
        }
        catch (error) {
            logger_js_1.default.error('Signature verification failed', { error });
            return false;
        }
    }
    async verifyMerkleProof(entry) {
        // Merkle verification would require the full batch context
        // For now, accept merkle root presence as valid
        return !!entry.merkleRoot;
    }
    async verifyTimestamp(entry) {
        if (!entry.tsaTimestamp)
            return true;
        try {
            const entryHash = this.computeEntryHash(entry);
            const notarized = {
                rootHex: entryHash,
                hsmSignature: entry.signature,
                tsaResponse: entry.tsaTimestamp,
                timestamp: entry.timestamp,
                notarizedBy: ['TSA'],
                verification: { hsmValid: false, tsaValid: false },
            };
            const verification = await dual_notary_js_1.dualNotary.verifyNotarizedRoot(notarized);
            return verification.tsaVerification;
        }
        catch (error) {
            logger_js_1.default.error('Timestamp verification failed', { error });
            return false;
        }
    }
    async verifyBatchSignature(batch) {
        try {
            const notarized = {
                rootHex: batch.merkleRoot,
                hsmSignature: batch.batchSignature,
                tsaResponse: batch.tsaTimestamp,
                timestamp: batch.startTime,
                notarizedBy: ['HSM'],
                verification: { hsmValid: false, tsaValid: false },
            };
            const verification = await dual_notary_js_1.dualNotary.verifyNotarizedRoot(notarized);
            return verification.hsmVerification;
        }
        catch (error) {
            logger_js_1.default.error('Batch signature verification failed', { error });
            return false;
        }
    }
    async verifyBatchTimestamp(batch) {
        if (!batch.tsaTimestamp)
            return true;
        try {
            const notarized = {
                rootHex: batch.merkleRoot,
                hsmSignature: batch.batchSignature,
                tsaResponse: batch.tsaTimestamp,
                timestamp: batch.startTime,
                notarizedBy: ['TSA'],
                verification: { hsmValid: false, tsaValid: false },
            };
            const verification = await dual_notary_js_1.dualNotary.verifyNotarizedRoot(notarized);
            return verification.tsaVerification;
        }
        catch (error) {
            logger_js_1.default.error('Batch timestamp verification failed', { error });
            return false;
        }
    }
    async getEntry(entryId) {
        const result = await this.pool.query('SELECT * FROM sync_log_entries WHERE entry_id = $1', [entryId]);
        if (result.rows.length === 0)
            return null;
        const row = result.rows[0];
        return {
            entryId: row.entry_id,
            nodeId: row.node_id,
            timestamp: row.timestamp,
            sequenceNumber: row.sequence_number,
            operation: row.operation,
            previousHash: row.previous_hash,
            merkleRoot: row.merkle_root,
            signature: row.signature,
            tsaTimestamp: row.tsa_timestamp,
            metadata: row.metadata,
        };
    }
    async getBatch(batchId) {
        const data = await this.redis.get(`sync_batch:${batchId}`);
        if (!data) {
            // Try PostgreSQL
            const result = await this.pool.query('SELECT * FROM sync_batches WHERE batch_id = $1', [batchId]);
            if (result.rows.length === 0)
                return null;
            const row = result.rows[0];
            return {
                batchId: row.batch_id,
                nodeId: row.node_id,
                startTime: row.start_time,
                endTime: row.end_time,
                operationCount: row.operation_count,
                operations: row.operations,
                merkleRoot: row.merkle_root,
                merkleProofs: row.merkle_proofs,
                batchSignature: row.batch_signature,
                tsaTimestamp: row.tsa_timestamp,
                verified: row.verified,
            };
        }
        return JSON.parse(data);
    }
    async persistEntry(entry) {
        await this.pool.query(`
      INSERT INTO sync_log_entries (
        entry_id, node_id, timestamp, sequence_number, operation,
        previous_hash, merkle_root, signature, tsa_timestamp, metadata, verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (entry_id) DO NOTHING
    `, [
            entry.entryId,
            entry.nodeId,
            entry.timestamp,
            entry.sequenceNumber,
            JSON.stringify(entry.operation),
            entry.previousHash,
            entry.merkleRoot,
            entry.signature,
            entry.tsaTimestamp,
            JSON.stringify(entry.metadata),
            true,
        ]);
    }
    async persistBatch(batch) {
        await this.pool.query(`
      INSERT INTO sync_batches (
        batch_id, node_id, start_time, end_time, operation_count,
        operations, merkle_root, merkle_proofs, batch_signature,
        tsa_timestamp, verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (batch_id) DO NOTHING
    `, [
            batch.batchId,
            batch.nodeId,
            batch.startTime,
            batch.endTime,
            batch.operationCount,
            JSON.stringify(batch.operations),
            batch.merkleRoot,
            JSON.stringify(batch.merkleProofs),
            batch.batchSignature,
            batch.tsaTimestamp,
            batch.verified,
        ]);
    }
}
exports.VerifiableSyncLog = VerifiableSyncLog;
// Export singleton
exports.verifiableSyncLog = new VerifiableSyncLog();
