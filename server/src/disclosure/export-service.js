"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disclosureExportService = exports.DisclosureExportService = void 0;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const fs_2 = require("fs");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const promises_1 = require("stream/promises");
const zod_1 = require("zod");
const postgres_js_1 = require("../db/postgres.js");
const bundle_js_1 = require("./bundle.js");
const disclosureMetrics_js_1 = require("../metrics/disclosureMetrics.js");
const redact_js_1 = require("../redaction/redact.js");
const node_fetch_1 = __importDefault(require("node-fetch"));
const MAX_WINDOW_DAYS = 31;
const MAX_EVENTS = 10_000;
const JOB_TTL_DAYS = 7;
const DEFAULT_ARTIFACTS = [
    'audit-trail',
    'sbom',
    'attestations',
    'policy-reports',
];
const requestSchema = zod_1.z.object({
    tenantId: zod_1.z.string().min(1),
    startTime: zod_1.z.string().transform((value) => new Date(value)),
    endTime: zod_1.z.string().transform((value) => new Date(value)),
    artifacts: zod_1.z
        .array(zod_1.z.enum(['audit-trail', 'sbom', 'attestations', 'policy-reports']))
        .optional(),
    callbackUrl: zod_1.z.string().url().optional(),
});
async function ensureDir(dir) {
    await fs_1.promises.mkdir(dir, { recursive: true });
}
async function hashFile(filePath) {
    const hash = (0, crypto_1.createHash)('sha256');
    const stream = (0, fs_2.createReadStream)(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    await (0, promises_1.finished)(stream);
    return hash.digest('hex');
}
function merkleFromHashes(hashes) {
    if (hashes.length === 0)
        return '';
    let layer = hashes.slice().sort();
    while (layer.length > 1) {
        const next = [];
        for (let i = 0; i < layer.length; i += 2) {
            const left = layer[i];
            const right = layer[i + 1] ?? layer[i];
            const hash = (0, crypto_1.createHash)('sha256')
                .update(left + right)
                .digest('hex');
            next.push(hash);
        }
        layer = next;
    }
    return layer[0];
}
class DisclosureExportService {
    jobs = new Map();
    redaction = new redact_js_1.RedactionService();
    async createJob(input) {
        const parsed = requestSchema.parse(input);
        if (Number.isNaN(parsed.startTime.getTime()) ||
            Number.isNaN(parsed.endTime.getTime())) {
            throw new Error('invalid_time_range');
        }
        if (parsed.endTime <= parsed.startTime) {
            throw new Error('end_before_start');
        }
        const diffDays = (parsed.endTime.getTime() - parsed.startTime.getTime()) /
            (1000 * 60 * 60 * 24);
        if (diffDays > MAX_WINDOW_DAYS) {
            throw new Error('window_too_large');
        }
        const jobId = (0, crypto_1.randomUUID)();
        const nowIso = new Date().toISOString();
        const workingDir = path_1.default.join(os_1.default.tmpdir(), 'disclosures', jobId);
        await ensureDir(workingDir);
        const job = {
            id: jobId,
            tenantId: parsed.tenantId,
            status: 'pending',
            createdAt: nowIso,
            warnings: [],
            artifactStats: {},
            request: {
                tenantId: parsed.tenantId,
                startTime: parsed.startTime,
                endTime: parsed.endTime,
                artifacts: parsed.artifacts?.length
                    ? parsed.artifacts
                    : DEFAULT_ARTIFACTS,
                callbackUrl: parsed.callbackUrl,
            },
            workingDir,
            expiresAt: new Date(Date.now() + JOB_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
            attestations: [],
            artifactDigests: {},
        };
        this.jobs.set(jobId, job);
        setImmediate(() => {
            this.processJob(jobId).catch((error) => {
                console.error('Disclosure export failed', error);
            });
        });
        return this.publicJob(job);
    }
    listJobsForTenant(tenantId) {
        return Array.from(this.jobs.values())
            .filter((job) => job.tenantId === tenantId)
            .map((job) => this.publicJob(job));
    }
    getJob(jobId) {
        const job = this.jobs.get(jobId);
        if (!job)
            return undefined;
        return this.publicJob(job);
    }
    getDownload(jobId) {
        const job = this.jobs.get(jobId);
        if (!job || !job.bundlePath)
            return undefined;
        return { job: this.publicJob(job), filePath: job.bundlePath };
    }
    async processJob(jobId) {
        const job = this.jobs.get(jobId);
        if (!job)
            return;
        job.status = 'running';
        job.startedAt = new Date().toISOString();
        disclosureMetrics_js_1.disclosureMetrics.exportStarted(job.tenantId);
        const startedAt = Date.now();
        const artifacts = [];
        const artifactHashes = [];
        const warnings = [];
        try {
            const pool = (0, postgres_js_1.getPostgresPool)();
            const { tenantId, startTime, endTime, artifacts: requestedArtifacts, callbackUrl, } = job.request;
            if (requestedArtifacts.includes('audit-trail')) {
                const result = await this.collectAuditTrail({
                    job,
                    pool,
                    startTime,
                    endTime,
                });
                artifacts.push({
                    name: 'audit-trail.json',
                    path: result.filePath,
                    sha256: result.hash,
                });
                artifactHashes.push(result.hash);
                job.artifactDigests['audit-trail.json'] = result.hash;
                job.artifactStats['audit-trail'] = result.count;
                warnings.push(...result.warnings.map((w) => `audit:${w}`));
            }
            if (requestedArtifacts.includes('sbom')) {
                const result = await this.collectSbomReports({
                    job,
                    pool,
                    startTime,
                    endTime,
                });
                if (result) {
                    artifacts.push({
                        name: 'sbom-reports.json',
                        path: result.filePath,
                        sha256: result.hash,
                    });
                    artifactHashes.push(result.hash);
                    job.artifactDigests['sbom-reports.json'] = result.hash;
                    job.artifactStats['sbom'] = result.count;
                    warnings.push(...result.warnings.map((w) => `sbom:${w}`));
                }
            }
            if (requestedArtifacts.includes('policy-reports')) {
                const result = await this.collectPolicyReports({
                    job,
                    pool,
                    startTime,
                    endTime,
                });
                if (result) {
                    artifacts.push({
                        name: 'policy-reports.json',
                        path: result.filePath,
                        sha256: result.hash,
                    });
                    artifactHashes.push(result.hash);
                    job.artifactDigests['policy-reports.json'] = result.hash;
                    job.artifactStats['policy-reports'] = result.count;
                    warnings.push(...result.warnings.map((w) => `policy:${w}`));
                }
            }
            if (requestedArtifacts.includes('attestations')) {
                const result = await this.collectAttestations({
                    job,
                    pool,
                    startTime,
                    endTime,
                });
                if (result) {
                    artifacts.push({
                        name: 'attestations.json',
                        path: result.filePath,
                        sha256: result.hash,
                    });
                    artifactHashes.push(result.hash);
                    job.artifactDigests['attestations.json'] = result.hash;
                    job.artifactStats['attestations'] = result.count;
                    warnings.push(...result.warnings.map((w) => `attestation:${w}`));
                    job.attestations = result.attestations;
                }
            }
            const claimSet = this.buildClaimSet(job, artifactHashes, warnings);
            job.claimSet = claimSet;
            const merkleRoot = merkleFromHashes(artifactHashes);
            const { path: bundlePath, sha256 } = await (0, bundle_js_1.makeBundle)({
                artifacts,
                claimSet,
                merkleRoot,
                attestations: job.attestations,
            });
            job.bundlePath = bundlePath;
            job.sha256 = sha256;
            job.downloadUrl = `/disclosures/export/${job.id}/download`;
            job.status = 'completed';
            job.completedAt = new Date().toISOString();
            job.warnings = warnings;
            const stats = await fs_1.promises.stat(bundlePath);
            disclosureMetrics_js_1.disclosureMetrics.exportCompleted(job.tenantId, Date.now() - startedAt, stats.size, warnings);
            if (callbackUrl) {
                await this.notifyWebhook(callbackUrl, job).catch((error) => {
                    warnings.push('webhook_failed');
                    console.error('Disclosure webhook failed', error);
                });
            }
        }
        catch (error) {
            job.status = 'failed';
            job.error = (error instanceof Error ? error.message : String(error)) || 'export_failed';
            job.completedAt = new Date().toISOString();
            job.warnings = warnings;
            disclosureMetrics_js_1.disclosureMetrics.exportFailed(job.tenantId);
        }
    }
    buildClaimSet(job, artifactHashes, warnings) {
        const signature = this.signClaimSet({
            jobId: job.id,
            tenantId: job.tenantId,
            window: {
                start: job.request.startTime.toISOString(),
                end: job.request.endTime.toISOString(),
            },
            artifacts: artifactHashes,
            warnings,
            createdAt: new Date().toISOString(),
        });
        return {
            id: `claimset-${job.id}`,
            tenantId: job.tenantId,
            window: {
                start: job.request.startTime.toISOString(),
                end: job.request.endTime.toISOString(),
            },
            artifacts: artifactHashes,
            warnings,
            signature,
        };
    }
    signClaimSet(payload) {
        const secret = process.env.DISCLOSURE_SIGNING_SECRET || 'dev-disclosure-secret';
        const keyId = process.env.DISCLOSURE_SIGNING_KEY_ID || 'local-dev';
        const bytes = Buffer.from(JSON.stringify(payload));
        const digest = (0, crypto_1.createHash)('sha256').update(bytes).digest('hex');
        const mac = (0, crypto_1.createHmac)('sha256', secret).update(bytes).digest('hex');
        return { keyId, digest, signature: mac, algorithm: 'HMAC-SHA256' };
    }
    async notifyWebhook(callbackUrl, job) {
        const payload = {
            jobId: job.id,
            status: job.status,
            sha256: job.sha256,
            downloadUrl: job.downloadUrl,
            warnings: job.warnings,
            tenantId: job.tenantId,
            completedAt: job.completedAt,
        };
        await (0, node_fetch_1.default)(callbackUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
        });
    }
    async collectAuditTrail({ job, pool, startTime, endTime, }) {
        const { rows } = await pool.query(`SELECT * FROM audit_events
       WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
       ORDER BY created_at ASC
       LIMIT $4`, [
            job.tenantId,
            startTime.toISOString(),
            endTime.toISOString(),
            MAX_EVENTS + 1,
        ]);
        const truncated = rows.length > MAX_EVENTS;
        const selected = truncated ? rows.slice(0, MAX_EVENTS) : rows;
        const sanitized = [];
        for (const row of selected) {
            const clean = await this.redaction.redactObject(row, {
                rules: ['pii', 'sensitive', 'financial'],
            }, job.tenantId, { jobId: job.id });
            sanitized.push(clean);
        }
        const filePath = path_1.default.join(job.workingDir, 'audit-trail.json');
        await this.writeJsonObject(filePath, {
            tenantId: job.tenantId,
            window: { start: startTime.toISOString(), end: endTime.toISOString() },
            count: sanitized.length,
            events: sanitized,
        });
        const hash = await hashFile(filePath);
        const warnings = truncated ? ['truncated'] : [];
        return { filePath, count: sanitized.length, hash, warnings };
    }
    async collectSbomReports({ job, pool, startTime, endTime, }) {
        const { rows } = await pool.query(`SELECT sr.sbom, sr.created_at
         FROM sbom_reports sr
         JOIN run r ON r.id = sr.run_id
        WHERE r.tenant_id = $1
          AND sr.created_at BETWEEN $2 AND $3
        ORDER BY sr.created_at ASC
        LIMIT 5000`, [job.tenantId, startTime.toISOString(), endTime.toISOString()]);
        if (!rows.length) {
            return null;
        }
        const normalized = rows.map((row) => ({
            createdAt: row.created_at instanceof Date
                ? row.created_at.toISOString()
                : row.created_at,
            sbom: row.sbom,
        }));
        const filePath = path_1.default.join(job.workingDir, 'sbom-reports.json');
        await this.writeJsonObject(filePath, {
            tenantId: job.tenantId,
            reports: normalized,
        });
        const hash = await hashFile(filePath);
        return {
            filePath,
            count: normalized.length,
            hash,
            warnings: [],
        };
    }
    async collectPolicyReports({ job, pool, startTime, endTime, }) {
        const { rows } = await pool.query(`SELECT policy, decision, created_at, user_id
         FROM policy_audit
        WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
        ORDER BY created_at ASC
        LIMIT 5000`, [job.tenantId, startTime.toISOString(), endTime.toISOString()]);
        if (!rows.length) {
            return null;
        }
        const sanitized = [];
        for (const row of rows) {
            const clean = await this.redaction.redactObject(row, {
                rules: ['pii', 'sensitive'],
            }, job.tenantId, { jobId: job.id, artifact: 'policy' });
            sanitized.push(clean);
        }
        const filePath = path_1.default.join(job.workingDir, 'policy-reports.json');
        await this.writeJsonObject(filePath, {
            tenantId: job.tenantId,
            entries: sanitized,
        });
        const hash = await hashFile(filePath);
        return {
            filePath,
            count: sanitized.length,
            hash,
            warnings: [],
        };
    }
    async collectAttestations({ job, pool, startTime, endTime, }) {
        const { rows } = await pool.query(`SELECT attestation, created_at
         FROM slsa_attestations
        WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
        ORDER BY created_at ASC
        LIMIT 2000`, [job.tenantId, startTime.toISOString(), endTime.toISOString()]);
        if (!rows.length) {
            return null;
        }
        const attestations = rows.map((row) => ({
            createdAt: row.created_at instanceof Date
                ? row.created_at.toISOString()
                : row.created_at,
            attestation: row.attestation,
        }));
        const filePath = path_1.default.join(job.workingDir, 'attestations.json');
        await this.writeJsonObject(filePath, {
            tenantId: job.tenantId,
            attestations,
        });
        const hash = await hashFile(filePath);
        const mismatchedDigests = this.verifyAttestationSubjects(attestations, job);
        const warnings = mismatchedDigests.length
            ? mismatchedDigests.map((id) => `subject_digest_mismatch:${id}`)
            : [];
        return {
            filePath,
            count: attestations.length,
            hash,
            warnings,
            attestations: attestations.map((row) => row.attestation),
        };
    }
    verifyAttestationSubjects(attestations, job) {
        const mismatches = [];
        const artifactHashes = new Set(Object.values(job.artifactDigests));
        for (const entry of attestations) {
            const attestation = entry.attestation;
            const subjects = attestation?.subject || [];
            for (const subject of subjects) {
                const digest = subject?.digest?.sha256;
                if (!digest)
                    continue;
                if (!artifactHashes.has(digest)) {
                    mismatches.push(subject?.name || 'unknown');
                }
            }
        }
        return mismatches;
    }
    async writeJsonObject(filePath, obj) {
        await new Promise((resolve, reject) => {
            const stream = (0, fs_2.createWriteStream)(filePath, { encoding: 'utf8' });
            stream.on('error', reject);
            stream.on('finish', () => resolve());
            stream.write(JSON.stringify(obj, null, 2));
            stream.end();
        });
    }
    publicJob(job) {
        return {
            id: job.id,
            tenantId: job.tenantId,
            status: job.status,
            createdAt: job.createdAt,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
            expiresAt: job.expiresAt,
            warnings: job.warnings,
            artifactStats: job.artifactStats,
            downloadUrl: job.downloadUrl,
            sha256: job.sha256,
            error: job.error,
            claimSet: job.claimSet,
        };
    }
}
exports.DisclosureExportService = DisclosureExportService;
exports.disclosureExportService = new DisclosureExportService();
