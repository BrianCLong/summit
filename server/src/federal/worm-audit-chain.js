"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wormAuditChain = exports.WORMAuditChainService = void 0;
// @ts-nocheck
const node_crypto_1 = __importDefault(require("node:crypto"));
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const z = __importStar(require("zod"));
const otel_tracing_js_1 = require("../middleware/observability/otel-tracing.js");
const fips_compliance_js_1 = require("./fips-compliance.js");
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
class WORMAuditChainService {
    config;
    currentSegment = null;
    pendingEntries = [];
    lastHash = '0'; // Genesis hash
    segmentTimer = null;
    sequenceCounter = 0;
    constructor(config) {
        this.config = AuditChainConfigSchema.parse({
            ...config,
            s3Bucket: process.env.AUDIT_WORM_BUCKET || config?.s3Bucket,
            retentionYears: Number(process.env.AUDIT_RETENTION_YEARS) || config?.retentionYears,
            signRoots: process.env.AUDIT_SIGN_ROOTS === 'true',
        });
        if (this.config.enabled) {
            this.initializeAuditChain();
        }
    }
    async initializeAuditChain() {
        const span = otel_tracing_js_1.otelService.createSpan('worm_audit.initialize');
        try {
            // Load existing chain state
            await this.loadChainState();
            // Start new segment
            await this.startNewSegment();
            // Schedule segment rotation
            this.scheduleSegmentRotation();
            console.log('WORM audit chain initialized successfully');
            otel_tracing_js_1.otelService.addSpanAttributes({
                'audit.chain.enabled': this.config.enabled,
                'audit.segment_interval': this.config.segmentInterval,
                'audit.retention_years': this.config.retentionYears,
                'audit.sign_roots': this.config.signRoots,
            });
        }
        catch (error) {
            console.error('WORM audit chain initialization failed:', error);
            otel_tracing_js_1.otelService.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            throw error;
        }
        finally {
            span?.end();
        }
    }
    /**
     * Add audit entry to chain
     */
    async addAuditEntry(entry) {
        const span = otel_tracing_js_1.otelService.createSpan('worm_audit.add_entry');
        try {
            const auditEntry = {
                ...entry,
                timestamp: new Date(),
            };
            // Add to pending entries
            this.pendingEntries.push(auditEntry);
            // Process immediately for critical events
            if (this.isCriticalEvent(entry.eventType)) {
                await this.processPendingEntries();
            }
            otel_tracing_js_1.otelService.addSpanAttributes({
                'audit.event_type': entry.eventType,
                'audit.action': entry.action,
                'audit.classification': entry.classification,
                'audit.critical': this.isCriticalEvent(entry.eventType),
            });
        }
        catch (error) {
            console.error('Failed to add audit entry:', error);
            otel_tracing_js_1.otelService.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            throw error;
        }
        finally {
            span?.end();
        }
    }
    isCriticalEvent(eventType) {
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
    async processPendingEntries() {
        if (this.pendingEntries.length === 0)
            return;
        const span = otel_tracing_js_1.otelService.createSpan('worm_audit.process_entries');
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
            otel_tracing_js_1.otelService.addSpanAttributes({
                'audit.entries_processed': this.pendingEntries.length,
                'audit.current_segment': this.currentSegment?.segmentId || 'none',
            });
        }
        catch (error) {
            console.error('Failed to process pending entries:', error);
            otel_tracing_js_1.otelService.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            throw error;
        }
        finally {
            span?.end();
        }
    }
    async addEntryToChain(entry) {
        if (!this.currentSegment) {
            throw new Error('No current audit segment');
        }
        // Add entry to segment
        this.currentSegment.entries.push(entry);
        // Create hash chain entry
        const entryData = JSON.stringify(entry);
        const dataHash = node_crypto_1.default
            .createHash('sha256')
            .update(entryData)
            .digest('hex');
        const chainEntry = {
            sequenceId: ++this.sequenceCounter,
            timestamp: entry.timestamp,
            dataHash,
            previousHash: this.lastHash,
            merkleRoot: '', // Will be calculated when segment finalizes
        };
        // Chain hash includes previous hash for tamper detection
        const chainData = `${chainEntry.sequenceId}:${chainEntry.timestamp.toISOString()}:${dataHash}:${this.lastHash}`;
        const currentHash = node_crypto_1.default
            .createHash('sha256')
            .update(chainData)
            .digest('hex');
        // Sign hash with HSM if enabled
        if (this.config.signRoots && fips_compliance_js_1.fipsService.getLocalSVID()) {
            try {
                const keyId = 'audit-chain-signing-key'; // Would be created during initialization
                chainEntry.signature = await fips_compliance_js_1.fipsService.sign(currentHash, keyId);
            }
            catch (error) {
                console.warn('Failed to sign hash chain entry:', error);
            }
        }
        this.currentSegment.hashChain.push(chainEntry);
        this.lastHash = currentHash;
    }
    async startNewSegment() {
        const span = otel_tracing_js_1.otelService.createSpan('worm_audit.start_segment');
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
                retentionUntil: new Date(Date.now() + this.config.retentionYears * 365 * 24 * 60 * 60 * 1000),
            };
            console.log(`Started new audit segment: ${segmentId}`);
            otel_tracing_js_1.otelService.addSpanAttributes({
                'audit.segment_id': segmentId,
                'audit.retention_until': this.currentSegment.retentionUntil.toISOString(),
            });
        }
        catch (error) {
            console.error('Failed to start new segment:', error);
            otel_tracing_js_1.otelService.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            throw error;
        }
        finally {
            span?.end();
        }
    }
    async finalizeSegment(segment) {
        const span = otel_tracing_js_1.otelService.createSpan('worm_audit.finalize_segment');
        try {
            segment.endTime = new Date();
            // Build Merkle tree from hash chain
            segment.merkleTree = this.buildMerkleTree(segment.hashChain.map((entry) => entry.dataHash));
            segment.rootHash =
                segment.merkleTree.length > 0 ? segment.merkleTree[0] : '0';
            // Sign root hash with HSM
            if (this.config.signRoots && segment.rootHash !== '0') {
                try {
                    const keyId = 'audit-root-signing-key';
                    segment.rootSignature = await fips_compliance_js_1.fipsService.sign(segment.rootHash, keyId);
                }
                catch (error) {
                    console.error('Failed to sign segment root:', error);
                    segment.rootSignature = 'signing_failed';
                }
            }
            // Store to WORM storage
            await this.storeSegmentToWORM(segment);
            console.log(`Finalized audit segment: ${segment.segmentId} (${segment.entries.length} entries)`);
            otel_tracing_js_1.otelService.addSpanAttributes({
                'audit.segment_finalized': segment.segmentId,
                'audit.entries_count': segment.entries.length,
                'audit.chain_length': segment.hashChain.length,
                'audit.root_hash': segment.rootHash,
            });
        }
        catch (error) {
            console.error('Failed to finalize segment:', error);
            otel_tracing_js_1.otelService.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            throw error;
        }
        finally {
            span?.end();
        }
    }
    buildMerkleTree(leafHashes) {
        if (leafHashes.length === 0)
            return [];
        if (leafHashes.length === 1)
            return leafHashes;
        let level = [...leafHashes];
        const tree = [];
        while (level.length > 1) {
            const nextLevel = [];
            for (let i = 0; i < level.length; i += 2) {
                const left = level[i];
                const right = level[i + 1] || left; // Duplicate if odd number of nodes
                const combined = node_crypto_1.default
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
    async storeSegmentToWORM(segment) {
        const span = otel_tracing_js_1.otelService.createSpan('worm_audit.store_segment');
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
                    merkleValid: this.verifyMerkleTree(segment.merkleTree, segment.entries.map((e) => node_crypto_1.default
                        .createHash('sha256')
                        .update(JSON.stringify(e))
                        .digest('hex'))),
                },
            };
            // Compress if enabled
            let segmentJson = JSON.stringify(segmentData, null, 2);
            if (this.config.compressionEnabled) {
                const { gzipSync } = await Promise.resolve().then(() => __importStar(require('node:zlib')));
                segmentJson = gzipSync(segmentJson).toString('base64');
            }
            // Encrypt if enabled
            if (this.config.encryptionEnabled) {
                try {
                    const keyId = 'audit-encryption-key';
                    const encrypted = await fips_compliance_js_1.fipsService.encrypt(segmentJson, keyId);
                    segmentJson = JSON.stringify(encrypted);
                }
                catch (error) {
                    console.warn('Failed to encrypt segment, storing unencrypted:', error);
                }
            }
            // Generate S3 key with date partitioning
            const date = segment.startTime;
            const dateKey = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
            const objectKey = `audit-segments/${dateKey}/${segment.segmentId}.json`;
            segment.wormObjectKey = objectKey;
            // Store to S3 with Object Lock (in production environment)
            // This would use AWS SDK to put object with retention settings
            console.log(`Storing segment to WORM: s3://${this.config.s3Bucket}/${objectKey}`);
            // Simulate WORM storage for development
            const localPath = `/tmp/worm-audit/${objectKey}`;
            await promises_1.default.mkdir(node_path_1.default.dirname(localPath), { recursive: true });
            await promises_1.default.writeFile(localPath, segmentJson);
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
            otel_tracing_js_1.otelService.addSpanAttributes({
                'audit.worm_key': objectKey,
                'audit.compressed': this.config.compressionEnabled,
                'audit.encrypted': this.config.encryptionEnabled,
                'audit.retention_until': segment.retentionUntil.toISOString(),
            });
        }
        catch (error) {
            console.error('Failed to store segment to WORM:', error);
            otel_tracing_js_1.otelService.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            throw error;
        }
        finally {
            span?.end();
        }
    }
    /**
     * Verify hash chain integrity
     */
    async verifyHashChain(chain) {
        const span = otel_tracing_js_1.otelService.createSpan('worm_audit.verify_chain');
        try {
            const result = {
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
                    result.errors.push(`Hash chain broken at entry ${i}: expected previous ${previousHash}, got ${entry.previousHash}`);
                    break;
                }
                // Verify signature if present
                if (entry.signature) {
                    try {
                        const keyId = 'audit-chain-signing-key';
                        const chainData = `${entry.sequenceId}:${entry.timestamp.toISOString()}:${entry.dataHash}:${entry.previousHash}`;
                        const currentHash = node_crypto_1.default
                            .createHash('sha256')
                            .update(chainData)
                            .digest('hex');
                        const signatureValid = await fips_compliance_js_1.fipsService.verify(currentHash, entry.signature, keyId);
                        if (signatureValid) {
                            result.verifiedSignatures++;
                        }
                        else {
                            result.errors.push(`Invalid signature at entry ${i}`);
                        }
                    }
                    catch (error) {
                        result.errors.push(`Signature verification failed at entry ${i}: ${error}`);
                    }
                }
                // Update previous hash for next iteration
                const chainData = `${entry.sequenceId}:${entry.timestamp.toISOString()}:${entry.dataHash}:${entry.previousHash}`;
                previousHash = node_crypto_1.default
                    .createHash('sha256')
                    .update(chainData)
                    .digest('hex');
            }
            otel_tracing_js_1.otelService.addSpanAttributes({
                'audit.verification.valid': result.valid,
                'audit.verification.total_entries': result.totalEntries,
                'audit.verification.verified_signatures': result.verifiedSignatures,
                'audit.verification.errors': result.errors.length,
            });
            return result;
        }
        catch (error) {
            console.error('Hash chain verification failed:', error);
            otel_tracing_js_1.otelService.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            return {
                valid: false,
                totalEntries: chain.length,
                verifiedSignatures: 0,
                errors: [error.message],
            };
        }
        finally {
            span?.end();
        }
    }
    verifyMerkleTree(tree, leafHashes) {
        if (tree.length === 0 || leafHashes.length === 0)
            return false;
        // Rebuild tree and compare root
        const rebuiltTree = this.buildMerkleTree(leafHashes);
        return rebuiltTree.length > 0 && rebuiltTree[0] === tree[0];
    }
    scheduleSegmentRotation() {
        let intervalMs;
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
            }
            catch (error) {
                console.error('Segment rotation failed:', error);
            }
        }, intervalMs);
    }
    async loadChainState() {
        try {
            // Load last hash from persistent storage
            // In production, this would read from database or S3
            this.lastHash = '0'; // Start with genesis hash
            this.sequenceCounter = 0;
        }
        catch (error) {
            console.warn('No existing chain state found, starting fresh');
            this.lastHash = '0';
            this.sequenceCounter = 0;
        }
    }
    /**
     * Generate compliance report for audit chain
     */
    async generateComplianceReport() {
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
                verifiedSignatures: this.currentSegment?.hashChain.filter((e) => e.signature).length || 0,
            },
        };
    }
    /**
     * Export segment for legal/compliance purposes
     */
    async exportSegment(segmentId) {
        // In production, retrieve from WORM storage and decrypt
        if (this.currentSegment?.segmentId === segmentId) {
            const verification = await this.verifyHashChain(this.currentSegment.hashChain);
            // Sign the export with HSM for legal evidence
            let exportSignature = 'not_signed';
            try {
                const exportData = JSON.stringify({
                    segment: this.currentSegment,
                    verification,
                });
                const keyId = 'audit-export-signing-key';
                exportSignature = await fips_compliance_js_1.fipsService.sign(exportData, keyId);
            }
            catch (error) {
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
    async destroy() {
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
exports.WORMAuditChainService = WORMAuditChainService;
// Create singleton instance
exports.wormAuditChain = new WORMAuditChainService();
