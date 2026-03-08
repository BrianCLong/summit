"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evidenceIntegrityService = exports.EvidenceIntegrityService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const pino_1 = __importDefault(require("pino"));
const postgres_js_1 = require("../db/postgres.js");
const otel_tracing_js_1 = require("../middleware/observability/otel-tracing.js");
const incident_js_1 = require("../incident.js");
const INLINE_PREFIX = 'inline://evidence_artifact_content/';
class EvidenceIntegrityService {
    logger = pino_1.default({ name: 'EvidenceIntegrityService' });
    pool;
    storageRoot;
    constructor(options) {
        this.storageRoot =
            options?.storageRoot ||
                process.env.EVIDENCE_STORAGE_ROOT ||
                path_1.default.resolve(process.cwd(), 'uploads/evidence');
        this.pool = options?.pool || (0, postgres_js_1.getPostgresPool)();
    }
    async verifyAll(options = {}) {
        const chunkSize = Math.max(1, options.chunkSize ?? Number(process.env.EVIDENCE_INTEGRITY_CHUNK ?? 50));
        const rateLimitPerSecond = Math.max(1, options.rateLimitPerSecond ?? Number(process.env.EVIDENCE_INTEGRITY_RPS ?? 5));
        const emitIncidents = options.emitIncidents ?? false;
        const minIntervalMs = Math.ceil(1000 / rateLimitPerSecond);
        const span = otel_tracing_js_1.otelService.createSpan('evidence.integrity.verify');
        let cursor = {};
        let checked = 0;
        let chunksProcessed = 0;
        const mismatches = [];
        let lastProcessed = 0;
        try {
            while (true) {
                const rows = await this.fetchChunk(cursor, chunkSize);
                if (!rows.length)
                    break;
                chunksProcessed += 1;
                for (const artifact of rows) {
                    const now = Date.now();
                    const delta = now - lastProcessed;
                    if (delta < minIntervalMs) {
                        await new Promise((resolve) => setTimeout(resolve, minIntervalMs - delta));
                    }
                    lastProcessed = Date.now();
                    const mismatch = await this.verifyArtifact(artifact);
                    checked += 1;
                    if (mismatch) {
                        mismatches.push(mismatch);
                        if (emitIncidents) {
                            await (0, incident_js_1.openIncident)({
                                runbook: 'evidence-integrity',
                                tenant: artifact.run_id || 'global',
                                severity: 'CRITICAL',
                                reason: mismatch.mismatchType,
                                details: mismatch,
                            });
                        }
                    }
                }
                const last = rows[rows.length - 1];
                cursor = { createdAt: last.created_at, id: last.id };
            }
            const passed = checked - mismatches.length;
            const spanAttributes = {
                'evidence.integrity.checked': checked,
                'evidence.integrity.mismatches': mismatches.length,
                'evidence.integrity.chunks': chunksProcessed,
            };
            if (typeof span?.addSpanAttributes === 'function') {
                span.addSpanAttributes(spanAttributes);
            }
            else if (typeof span?.setAttribute === 'function') {
                Object.entries(spanAttributes).forEach(([key, value]) => {
                    span.setAttribute(key, value);
                });
            }
            return { checked, passed, mismatches, chunksProcessed };
        }
        catch (error) {
            this.logger.error({ err: error }, 'Evidence integrity verification failed');
            throw error;
        }
        finally {
            span?.end();
        }
    }
    async fetchChunk(cursor, limit) {
        const params = [];
        let whereClause = '';
        if (cursor.createdAt && cursor.id) {
            params.push(cursor.createdAt, cursor.id);
            whereClause =
                'WHERE (created_at > $1 OR (created_at = $1 AND id > $2))';
        }
        params.push(limit);
        const { rows } = await this.pool.query(`SELECT id, run_id, artifact_type, sha256_hash, s3_key, created_at
       FROM evidence_artifacts
       ${whereClause}
       ORDER BY created_at, id
       LIMIT $${params.length}`, params);
        return rows;
    }
    async verifyArtifact(artifact) {
        const storagePath = this.resolveStoragePath(artifact.s3_key);
        const contentBuffer = await this.loadContent(artifact, storagePath);
        if (!contentBuffer) {
            return {
                artifactId: artifact.id,
                runId: artifact.run_id,
                artifactType: artifact.artifact_type,
                expectedHash: artifact.sha256_hash,
                computedHash: null,
                fileHash: null,
                storagePath,
                mismatchType: 'missing_content',
                remediation: 'Restore the artifact content from backup or regenerate it from the source run.',
            };
        }
        const computedHash = crypto_1.default
            .createHash('sha256')
            .update(contentBuffer)
            .digest('hex');
        if (computedHash !== artifact.sha256_hash) {
            return {
                artifactId: artifact.id,
                runId: artifact.run_id,
                artifactType: artifact.artifact_type,
                expectedHash: artifact.sha256_hash,
                computedHash,
                fileHash: computedHash,
                storagePath,
                mismatchType: 'hash_mismatch',
                remediation: 'Re-ingest the artifact and reissue provenance to correct the stored hash.',
            };
        }
        return null;
    }
    resolveStoragePath(s3Key) {
        if (s3Key.startsWith(INLINE_PREFIX)) {
            return s3Key;
        }
        if (path_1.default.isAbsolute(s3Key)) {
            return s3Key;
        }
        return path_1.default.join(this.storageRoot, s3Key);
    }
    async loadContent(artifact, storagePath) {
        if (storagePath.startsWith(INLINE_PREFIX)) {
            const contentId = artifact.id;
            const { rows } = await this.pool.query('SELECT content FROM evidence_artifact_content WHERE artifact_id = $1', [contentId]);
            if (!rows.length)
                return null;
            return rows[0].content;
        }
        try {
            return await promises_1.default.readFile(storagePath);
        }
        catch (error) {
            this.logger.warn({ artifactId: artifact.id, storagePath, err: error }, 'Failed to read artifact content');
            return null;
        }
    }
}
exports.EvidenceIntegrityService = EvidenceIntegrityService;
exports.evidenceIntegrityService = new EvidenceIntegrityService();
