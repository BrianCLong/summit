"use strict";
/**
 * Provenance Service
 *
 * Records provenance and evidence for all media pipeline transforms.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.provenanceService = exports.ProvenanceService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_js_1 = require("../utils/logger.js");
const hash_js_1 = require("../utils/hash.js");
const time_js_1 = require("../utils/time.js");
const index_js_1 = __importDefault(require("../config/index.js"));
class ProvenanceService {
    log = (0, logger_js_1.createChildLogger)({ service: 'ProvenanceService' });
    client;
    constructor() {
        this.client = axios_1.default.create({
            baseURL: index_js_1.default.provLedgerUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'x-authority-id': index_js_1.default.authorityId,
                'x-reason-for-access': 'media-pipeline-provenance',
            },
        });
    }
    /**
     * Record evidence for a media asset
     */
    async recordEvidence(mediaAsset) {
        const correlationId = (0, hash_js_1.generateId)();
        this.log.info({ mediaAssetId: mediaAsset.id, correlationId }, 'Recording evidence for media asset');
        try {
            const record = {
                id: (0, hash_js_1.generateId)(),
                mediaAssetId: mediaAsset.id,
                eventType: 'evidence.registered',
                timestamp: (0, time_js_1.now)(),
                sourceRef: mediaAsset.sourceRef || mediaAsset.storage.key,
                checksum: mediaAsset.checksum,
                authorityId: index_js_1.default.authorityId,
                reasonForAccess: 'media-pipeline-ingest',
                policyLabels: this.extractPolicyLabels(mediaAsset.policy),
                caseId: mediaAsset.caseId,
                metadata: {
                    type: mediaAsset.type,
                    format: mediaAsset.format,
                    filename: mediaAsset.metadata.filename,
                    size: mediaAsset.metadata.size,
                    duration: mediaAsset.metadata.duration,
                    storage: mediaAsset.storage,
                },
            };
            const result = await this.sendRecord(record);
            this.log.info({ mediaAssetId: mediaAsset.id, recordId: record.id, correlationId }, 'Evidence recorded');
            return {
                success: true,
                recordId: result.id || record.id,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.log.error({ mediaAssetId: mediaAsset.id, correlationId, error: message }, 'Failed to record evidence');
            return {
                success: false,
                error: {
                    code: 'EVIDENCE_RECORD_FAILED',
                    message,
                    retryable: true,
                },
            };
        }
    }
    /**
     * Record a transform in the provenance chain
     */
    async recordTransform(input) {
        const correlationId = (0, hash_js_1.generateId)();
        this.log.info({
            mediaAssetId: input.mediaAssetId,
            transformStep: input.transformStep,
            correlationId,
        }, 'Recording transform');
        try {
            const record = {
                id: (0, hash_js_1.generateId)(),
                mediaAssetId: input.mediaAssetId,
                transcriptId: input.transcriptId,
                eventType: 'transform.recorded',
                timestamp: (0, time_js_1.now)(),
                sourceRef: `transform:${input.transformStep}`,
                checksum: input.outputChecksum || '',
                transformStep: input.transformStep,
                transformProvider: input.transformProvider,
                transformVersion: input.transformVersion,
                inputChecksum: input.inputChecksum,
                outputChecksum: input.outputChecksum,
                authorityId: index_js_1.default.authorityId,
                reasonForAccess: 'media-pipeline-transform',
                caseId: input.caseId,
                metadata: input.metadata,
            };
            const result = await this.sendRecord(record);
            this.log.info({ mediaAssetId: input.mediaAssetId, recordId: record.id, correlationId }, 'Transform recorded');
            return {
                success: true,
                recordId: result.id || record.id,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.log.error({ mediaAssetId: input.mediaAssetId, correlationId, error: message }, 'Failed to record transform');
            return {
                success: false,
                error: {
                    code: 'TRANSFORM_RECORD_FAILED',
                    message,
                    retryable: true,
                },
            };
        }
    }
    /**
     * Record a claim about a transcript or media asset
     */
    async recordClaim(mediaAssetId, transcriptId, content, caseId) {
        const correlationId = (0, hash_js_1.generateId)();
        this.log.info({ mediaAssetId, transcriptId, correlationId }, 'Recording claim');
        try {
            const record = {
                id: (0, hash_js_1.generateId)(),
                mediaAssetId,
                transcriptId,
                eventType: 'claim.created',
                timestamp: (0, time_js_1.now)(),
                sourceRef: `claim:${mediaAssetId}`,
                checksum: (0, hash_js_1.hashObject)(content),
                authorityId: index_js_1.default.authorityId,
                reasonForAccess: 'media-pipeline-claim',
                caseId,
                metadata: { content },
            };
            const result = await this.sendRecord(record);
            this.log.info({ mediaAssetId, recordId: record.id, correlationId }, 'Claim recorded');
            return {
                success: true,
                recordId: result.id || record.id,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.log.error({ mediaAssetId, correlationId, error: message }, 'Failed to record claim');
            return {
                success: false,
                error: {
                    code: 'CLAIM_RECORD_FAILED',
                    message,
                    retryable: true,
                },
            };
        }
    }
    /**
     * Build provenance object for a media asset transform chain
     */
    buildProvenance(mediaAsset, transforms) {
        return {
            sourceId: mediaAsset.id,
            sourceType: 'media_asset',
            ingestedAt: mediaAsset.createdAt,
            ingestedBy: index_js_1.default.authorityId,
            transformChain: transforms.map((t) => ({
                step: t.step,
                timestamp: (0, time_js_1.now)(),
                provider: t.provider,
                version: t.version,
                checksum: t.checksum,
            })),
            originalChecksum: mediaAsset.checksum,
            currentChecksum: transforms.length > 0 ? transforms[transforms.length - 1].checksum : undefined,
        };
    }
    /**
     * Get provenance chain for a media asset
     */
    async getProvenanceChain(mediaAssetId) {
        try {
            const response = await this.client.get(`/evidence`, {
                params: { sourceRef: `media:${mediaAssetId}` },
            });
            return response.data.records || [];
        }
        catch (error) {
            this.log.error({ mediaAssetId, error }, 'Failed to get provenance chain');
            return [];
        }
    }
    /**
     * Send record to provenance ledger
     */
    async sendRecord(record) {
        try {
            const response = await this.client.post('/evidence', {
                sourceRef: record.sourceRef,
                checksum: record.checksum,
                caseId: record.caseId,
                transformChain: [
                    {
                        step: record.transformStep || record.eventType,
                        timestamp: record.timestamp,
                        provider: record.transformProvider,
                        version: record.transformVersion,
                    },
                ],
                policyLabels: record.policyLabels,
                content: record.metadata,
            });
            return { id: response.data.id };
        }
        catch (error) {
            // In development/test, simulate success
            if (index_js_1.default.nodeEnv !== 'production') {
                this.log.warn({ recordId: record.id }, 'Prov-ledger unavailable, simulating record creation');
                return { id: record.id };
            }
            throw error;
        }
    }
    /**
     * Extract policy labels array from policy object
     */
    extractPolicyLabels(policy) {
        if (!policy)
            return [];
        const labels = [];
        if (policy.sensitivity)
            labels.push(`sensitivity:${policy.sensitivity}`);
        if (policy.classification)
            labels.push(`classification:${policy.classification}`);
        if (policy.clearance)
            labels.push(`clearance:${policy.clearance}`);
        return labels;
    }
}
exports.ProvenanceService = ProvenanceService;
exports.provenanceService = new ProvenanceService();
exports.default = exports.provenanceService;
