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
exports.evidenceRoutes = void 0;
// @ts-nocheck
// Evidence Export and Provenance API Routes
const express_1 = __importDefault(require("express"));
const crypto = __importStar(require("crypto"));
const crypto_1 = require("crypto");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prometheus_js_1 = require("../observability/prometheus.js");
const postgres_js_1 = require("../../db/postgres.js");
const rbac_middleware_js_1 = require("../auth/rbac-middleware.js");
const usage_ledger_js_1 = require("../../usage/usage-ledger.js");
const receipt_js_1 = require("../../maestro/evidence/receipt.js");
const suspiciousReceipt_js_1 = require("../../security/suspiciousReceipt.js");
const featureFlags_js_1 = require("../../lib/featureFlags.js");
const ledger_js_1 = require("../../provenance/ledger.js");
const router = express_1.default.Router();
exports.evidenceRoutes = router;
const metrics = prometheus_js_1.prometheusConductorMetrics;
const inlineContentKey = (artifactId) => `inline://evidence_artifact_content/${artifactId}`;
async function loadRunContext(runId) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    const { rows: runRows } = await pool.query(`SELECT id, runbook, status, started_at, ended_at FROM run WHERE id=$1`, [runId]);
    if (!runRows.length) {
        return { events: [], artifacts: [] };
    }
    const { rows: eventRows } = await pool.query(`SELECT kind, payload, ts FROM run_event WHERE run_id=$1 ORDER BY ts ASC`, [runId]);
    const { rows: artifactRows } = await pool.query(`SELECT id, artifact_type, sha256_hash, created_at
       FROM evidence_artifacts
      WHERE run_id=$1
      ORDER BY created_at ASC`, [runId]);
    return { run: runRows[0], events: eventRows, artifacts: artifactRows };
}
router.post('/receipt', (0, rbac_middleware_js_1.requirePermission)('evidence:create'), express_1.default.json(), async (req, res) => {
    const requestSizeBytes = Buffer.byteLength(JSON.stringify(req.body ?? {}), 'utf8');
    try {
        const { runId } = req.body || {};
        if (!runId) {
            usage_ledger_js_1.usageLedger.recordUsage({
                operationName: 'conductor.receipt.create',
                tenantId: req?.user?.tenantId,
                userId: req?.user?.userId || req?.user?.sub,
                timestamp: new Date(),
                requestSizeBytes,
                success: false,
                statusCode: 400,
                errorCategory: 'validation',
            });
            return res
                .status(400)
                .json({ success: false, error: 'runId is required' });
        }
        const { run, events, artifacts } = await loadRunContext(runId);
        if (!run) {
            return res.status(404).json({ success: false, error: 'Run not found' });
        }
        const receipt = (0, receipt_js_1.buildProvenanceReceipt)(run, events, artifacts);
        // Security Check: Suspicious Payload Detection
        if ((0, featureFlags_js_1.isEnabled)('SUSPICIOUS_DETECT_ENABLED')) {
            const suspiciousResult = (0, suspiciousReceipt_js_1.detectSuspiciousPayload)(receipt);
            if (suspiciousResult && suspiciousResult.isSuspicious) {
                try {
                    // Non-blocking audit event
                    await ledger_js_1.provenanceLedger.appendEntry({
                        tenantId: run.tenant_id || 'system', // Fallback if run doesn't have tenantId (though it should)
                        actionType: 'SuspiciousPayloadObserved',
                        resourceType: 'ProvenanceReceipt',
                        resourceId: receipt.receiptId,
                        actorId: req.user?.id || 'system',
                        actorType: req.user ? 'user' : 'system',
                        payload: {
                            reason: suspiciousResult.reason,
                            details: suspiciousResult.details,
                            runId: runId
                        },
                        metadata: {
                            detectionSource: 'receipt-ingestion'
                        }
                    });
                    console.warn(`[SuspiciousPayload] Detected suspicious payload in receipt ${receipt.receiptId}: ${suspiciousResult.reason}`);
                }
                catch (auditError) {
                    console.error('Failed to emit suspicious payload audit event', auditError);
                    // Don't block the request
                }
            }
        }
        const receiptJson = (0, receipt_js_1.canonicalStringify)(receipt);
        const receiptBuffer = Buffer.from(receiptJson);
        const artifactId = (0, crypto_1.randomUUID)();
        const sha256Hash = (0, crypto_1.createHash)('sha256')
            .update(receiptBuffer)
            .digest('hex');
        const pool = (0, postgres_js_1.getPostgresPool)();
        await pool.query(`INSERT INTO evidence_artifacts
         (id, run_id, artifact_type, s3_key, sha256_hash, size_bytes, created_at)
         VALUES ($1, $2, 'receipt', $3, $4, $5, now())`, [artifactId, runId, inlineContentKey(artifactId), sha256Hash, receiptBuffer.length]);
        await pool.query(`INSERT INTO evidence_artifact_content (artifact_id, content, content_type)
         VALUES ($1, $2, $3)`, [artifactId, receiptBuffer, 'application/json']);
        usage_ledger_js_1.usageLedger.recordUsage({
            operationName: 'conductor.receipt.create',
            tenantId: req?.user?.tenantId,
            userId: req?.user?.userId || req?.user?.sub,
            timestamp: new Date(),
            requestSizeBytes,
            success: true,
            statusCode: 200,
        });
        return res.json({ success: true, data: { receipt, artifactId } });
    }
    catch (error) {
        const message = error?.message || 'Failed to generate provenance receipt';
        usage_ledger_js_1.usageLedger.recordUsage({
            operationName: 'conductor.receipt.create',
            tenantId: req?.user?.tenantId,
            userId: req?.user?.userId || req?.user?.sub,
            timestamp: new Date(),
            requestSizeBytes,
            success: false,
            statusCode: 500,
            errorCategory: 'runtime',
        });
        return res.status(500).json({ success: false, error: message });
    }
});
router.get('/receipt/:runId', (0, rbac_middleware_js_1.requirePermission)('evidence:read'), async (req, res) => {
    try {
        const { runId } = req.params;
        const pool = (0, postgres_js_1.getPostgresPool)();
        const { rows: artifactRows } = await pool.query(`SELECT id FROM evidence_artifacts
         WHERE run_id=$1 AND artifact_type='receipt'
         ORDER BY created_at DESC
         LIMIT 1`, [runId]);
        if (!artifactRows.length) {
            return res
                .status(404)
                .json({ success: false, error: 'Receipt not found' });
        }
        const artifactId = artifactRows[0].id;
        const { rows: contentRows } = await pool.query(`SELECT content FROM evidence_artifact_content WHERE artifact_id=$1`, [artifactId]);
        if (!contentRows.length) {
            return res
                .status(404)
                .json({ success: false, error: 'Receipt content not found' });
        }
        const receipt = JSON.parse(contentRows[0].content.toString('utf8'));
        return res.json({ success: true, data: { receipt } });
    }
    catch (error) {
        const message = error?.message || 'Failed to load receipt';
        return res.status(500).json({ success: false, error: message });
    }
});
/**
 * POST /api/maestro/v1/evidence/export
 * Export evidence bundle with digital signature
 */
router.post('/export', async (req, res) => {
    const startTime = Date.now();
    try {
        const { runId, nodeId, format = 'json', includeArtifacts = true, sign = true, } = req.body;
        if (!runId) {
            return res.status(400).json({
                error: 'runId is required',
                code: 'MISSING_RUN_ID',
            });
        }
        // Generate evidence bundle
        const evidenceBundle = await generateEvidenceBundle(runId, nodeId, {
            includeArtifacts,
            format,
        });
        // Sign the bundle if requested
        if (sign) {
            evidenceBundle.signature = await signEvidenceBundle(evidenceBundle);
        }
        // Track metrics
        const duration = Date.now() - startTime;
        metrics?.evidenceExportLatency?.observe(duration / 1000);
        metrics?.evidenceExportRequests?.inc({
            status: 'success',
            format,
        });
        // Return bundle based on format
        if (format === 'download') {
            res.setHeader('Content-Disposition', `attachment; filename="evidence-${runId}-${Date.now()}.json"`);
            res.setHeader('Content-Type', 'application/json');
            return res.json(evidenceBundle);
        }
        res.json({
            success: true,
            evidenceId: evidenceBundle.id,
            hash: evidenceBundle.hash,
            signature: evidenceBundle.signature,
            bundle: evidenceBundle,
            downloadUrl: `/api/maestro/v1/evidence/${evidenceBundle.id}/download`,
            verifyUrl: `/api/maestro/v1/evidence/${evidenceBundle.id}/verify`,
        });
    }
    catch (error) {
        const duration = Date.now() - startTime;
        metrics?.evidenceExportLatency?.observe(duration / 1000);
        metrics?.evidenceExportRequests?.inc({
            status: 'error',
            format: req.body.format || 'json',
        });
        console.error('Evidence export error:', error);
        res.status(500).json({
            error: 'Failed to export evidence',
            code: 'EVIDENCE_EXPORT_FAILED',
            message: error.message,
        });
    }
});
/**
 * GET /api/maestro/v1/evidence/:evidenceId/download
 * Download evidence bundle
 */
router.get('/:evidenceId/download', async (req, res) => {
    try {
        const { evidenceId } = req.params;
        const { format = 'json' } = req.query;
        // Fetch evidence bundle from storage
        const evidenceBundle = await getEvidenceBundle(evidenceId);
        if (!evidenceBundle) {
            return res.status(404).json({
                error: 'Evidence bundle not found',
                code: 'EVIDENCE_NOT_FOUND',
                evidenceId,
            });
        }
        const filename = `evidence-${evidenceBundle.runId}-${evidenceId}.${format}`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        switch (format) {
            case 'json':
                res.setHeader('Content-Type', 'application/json');
                res.json(evidenceBundle);
                break;
            case 'yaml':
                res.setHeader('Content-Type', 'text/yaml');
                // In production, convert to YAML
                res.send(`# Evidence Bundle\n# Generated: ${evidenceBundle.timestamp}\n\n${JSON.stringify(evidenceBundle, null, 2)}`);
                break;
            default:
                res.setHeader('Content-Type', 'application/json');
                res.json(evidenceBundle);
        }
        metrics?.evidenceDownloadRequests?.inc({
            status: 'success',
            format,
        });
    }
    catch (error) {
        metrics?.evidenceDownloadRequests?.inc({
            status: 'error',
            format: req.query.format || 'json',
        });
        console.error('Evidence download error:', error);
        res.status(500).json({
            error: 'Failed to download evidence',
            code: 'EVIDENCE_DOWNLOAD_FAILED',
            message: error.message,
        });
    }
});
/**
 * POST /api/maestro/v1/evidence/:evidenceId/verify
 * Verify evidence bundle signature and integrity
 */
router.post('/:evidenceId/verify', async (req, res) => {
    try {
        const { evidenceId } = req.params;
        const { signature, expectedHash } = req.body;
        const evidenceBundle = await getEvidenceBundle(evidenceId);
        if (!evidenceBundle) {
            return res.status(404).json({
                error: 'Evidence bundle not found',
                code: 'EVIDENCE_NOT_FOUND',
                evidenceId,
            });
        }
        const verification = await verifyEvidenceBundle(evidenceBundle, signature || evidenceBundle.signature, expectedHash);
        metrics?.evidenceVerificationRequests?.inc({
            status: verification.valid ? 'success' : 'failed',
        });
        res.json({
            evidenceId,
            valid: verification.valid,
            verification,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        metrics?.evidenceVerificationRequests?.inc({
            status: 'error',
        });
        console.error('Evidence verification error:', error);
        res.status(500).json({
            error: 'Failed to verify evidence',
            code: 'EVIDENCE_VERIFICATION_FAILED',
            message: error.message,
        });
    }
});
/**
 * GET /api/maestro/v1/evidence/:evidenceId/artifacts
 * Get artifacts for evidence bundle
 */
router.get('/:evidenceId/artifacts', async (req, res) => {
    try {
        const { evidenceId } = req.params;
        const { type } = req.query;
        const evidenceBundle = await getEvidenceBundle(evidenceId);
        if (!evidenceBundle) {
            return res.status(404).json({
                error: 'Evidence bundle not found',
                code: 'EVIDENCE_NOT_FOUND',
                evidenceId,
            });
        }
        let artifacts = evidenceBundle.evidence.artifacts || [];
        if (type) {
            artifacts = artifacts.filter((artifact) => artifact.type === type);
        }
        res.json({
            evidenceId,
            artifacts: artifacts.map((artifact) => ({
                id: artifact.id,
                type: artifact.type,
                name: artifact.name,
                contentType: artifact.contentType,
                size: artifact.size,
                timestamp: artifact.timestamp,
                downloadUrl: `/api/maestro/v1/evidence/${evidenceId}/artifacts/${artifact.id}/download`,
                metadata: artifact.metadata,
            })),
            count: artifacts.length,
        });
    }
    catch (error) {
        console.error('Artifacts fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch artifacts',
            code: 'ARTIFACTS_FETCH_FAILED',
            message: error.message,
        });
    }
});
/**
 * GET /api/maestro/v1/evidence/:evidenceId/artifacts/:artifactId/download
 * Download specific artifact
 */
router.get('/:evidenceId/artifacts/:artifactId/download', async (req, res) => {
    try {
        const { evidenceId, artifactId } = req.params;
        const evidenceBundle = await getEvidenceBundle(evidenceId);
        if (!evidenceBundle) {
            return res.status(404).json({
                error: 'Evidence bundle not found',
                code: 'EVIDENCE_NOT_FOUND',
            });
        }
        const artifact = evidenceBundle.evidence.artifacts?.find((a) => a.id === artifactId);
        if (!artifact) {
            return res.status(404).json({
                error: 'Artifact not found',
                code: 'ARTIFACT_NOT_FOUND',
                artifactId,
            });
        }
        res.setHeader('Content-Disposition', `attachment; filename="${artifact.name}"`);
        res.setHeader('Content-Type', artifact.contentType);
        if (artifact.content) {
            res.send(artifact.content);
        }
        else {
            // In production, fetch from blob storage
            res.json({ message: 'Artifact content not available in storage' });
        }
    }
    catch (error) {
        console.error('Artifact download error:', error);
        res.status(500).json({
            error: 'Failed to download artifact',
            code: 'ARTIFACT_DOWNLOAD_FAILED',
            message: error.message,
        });
    }
});
// Helper functions
async function generateEvidenceBundle(runId, nodeId, options = {}) {
    const bundleId = `evidence-${runId}-${nodeId || 'full'}-${Date.now()}`;
    // In production, fetch from run database
    const mockDecision = {
        selectedExpert: 'openai-gpt-4',
        confidence: 0.92,
        reason: 'High confidence task, budget available, no PII detected',
        timestamp: new Date().toISOString(),
        alternatives: [
            {
                expert: 'anthropic-claude-3',
                score: 0.87,
                rejectionReason: 'Higher cost',
            },
            {
                expert: 'local-llm',
                score: 0.75,
                rejectionReason: 'Lower performance',
            },
        ],
    };
    const mockInputs = {
        query: 'Analyze the security implications of...',
        context: {
            userId: 'user-123',
            tenantId: 'tenant-abc',
            sensitivity: 'internal',
            urgency: 'medium',
        },
        constraints: {
            maxCost: 1.0,
            maxLatency: 5000,
            allowedProviders: ['openai', 'anthropic'],
        },
    };
    const mockOutputs = {
        result: 'Analysis complete...',
        tokens: {
            input: 150,
            output: 500,
            total: 650,
        },
        cost: 0.045,
        latency: 1200,
        model: 'gpt-4-0125-preview',
    };
    const artifacts = [];
    if (options.includeArtifacts) {
        artifacts.push({
            id: `${bundleId}-log`,
            type: 'log',
            name: 'execution.log',
            content: `[${new Date().toISOString()}] Starting execution...\n[${new Date().toISOString()}] Completed successfully`,
            contentType: 'text/plain',
            hash: (0, crypto_1.createHash)('sha256').update('log-content').digest('hex'),
            size: 125,
            timestamp: new Date(),
            metadata: { level: 'info', source: 'maestro-conductor' },
        }, {
            id: `${bundleId}-config`,
            type: 'config',
            name: 'run-config.json',
            content: JSON.stringify({ runId, nodeId, options }, null, 2),
            contentType: 'application/json',
            hash: crypto
                .createHash('sha256')
                .update('config-content')
                .digest('hex'),
            size: 256,
            timestamp: new Date(),
        });
        // Add SBOM if available
        artifacts.push({
            id: `${bundleId}-sbom`,
            type: 'sbom',
            name: 'software-bill-of-materials.json',
            content: JSON.stringify({
                bomFormat: 'CycloneDX',
                specVersion: '1.4',
                serialNumber: `urn:uuid:${bundleId}`,
                version: 1,
                metadata: {
                    timestamp: new Date().toISOString(),
                    tools: [
                        {
                            vendor: 'IntelGraph',
                            name: 'Maestro Conductor',
                            version: '1.0.0',
                        },
                    ],
                },
                components: [
                    {
                        type: 'library',
                        name: 'openai-gpt-4',
                        version: '0125-preview',
                        supplier: { name: 'OpenAI' },
                        hashes: [{ alg: 'SHA-256', content: 'abc123...' }],
                    },
                ],
            }, null, 2),
            contentType: 'application/json',
            hash: (0, crypto_1.createHash)('sha256').update('sbom-content').digest('hex'),
            size: 512,
            timestamp: new Date(),
            metadata: { format: 'CycloneDX', version: '1.4' },
        });
    }
    const bundle = {
        id: bundleId,
        timestamp: new Date(),
        runId,
        nodeId,
        metadata: {
            version: '1.0.0',
            format: 'intelgraph-evidence-v1',
            generator: 'maestro-conductor',
        },
        evidence: {
            decision: mockDecision,
            inputs: mockInputs,
            outputs: mockOutputs,
            artifacts,
            provenance: {
                agent: 'maestro-conductor',
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development',
                build: process.env.BUILD_ID || 'local',
            },
            sbom: artifacts.find((a) => a.type === 'sbom')?.content
                ? JSON.parse(artifacts.find((a) => a.type === 'sbom').content)
                : undefined,
            attestations: [
                {
                    type: 'execution',
                    statement: 'This execution completed successfully with no policy violations',
                    timestamp: new Date().toISOString(),
                    signature: 'mock-attestation-signature',
                },
            ],
        },
        hash: '',
    };
    // Calculate hash of bundle content
    const bundleContent = JSON.stringify({
        ...bundle,
        signature: undefined,
        hash: undefined,
    });
    bundle.hash = (0, crypto_1.createHash)('sha256').update(bundleContent).digest('hex');
    return bundle;
}
async function signEvidenceBundle(bundle) {
    // In production, use proper signing key from secure storage
    const privateKey = process.env.EVIDENCE_SIGNING_KEY || 'mock-private-key';
    const payload = {
        bundleId: bundle.id,
        hash: bundle.hash,
        timestamp: bundle.timestamp,
        iat: Math.floor(Date.now() / 1000),
        iss: 'maestro-conductor',
        sub: bundle.runId,
    };
    return jsonwebtoken_1.default.sign(payload, privateKey, { algorithm: 'HS256' });
}
async function verifyEvidenceBundle(bundle, signature, expectedHash) {
    const verification = {
        valid: false,
        checks: {
            hashMatch: false,
            signatureValid: false,
            timestampValid: false,
            integrityValid: false,
        },
        errors: [],
    };
    try {
        // Verify hash
        const bundleContent = JSON.stringify({
            ...bundle,
            signature: undefined,
            hash: undefined,
        });
        const calculatedHash = crypto
            .createHash('sha256')
            .update(bundleContent)
            .digest('hex');
        verification.checks.hashMatch = calculatedHash === bundle.hash;
        if (!verification.checks.hashMatch) {
            verification.errors.push('Hash mismatch - bundle may have been tampered with');
        }
        if (expectedHash) {
            const expectedHashMatch = calculatedHash === expectedHash;
            if (!expectedHashMatch) {
                verification.errors.push('Hash does not match expected value');
            }
        }
        // Verify signature
        if (signature) {
            try {
                const privateKey = process.env.EVIDENCE_SIGNING_KEY || 'mock-private-key';
                const decoded = jsonwebtoken_1.default.verify(signature, privateKey);
                verification.checks.signatureValid =
                    decoded.bundleId === bundle.id && decoded.hash === bundle.hash;
                if (!verification.checks.signatureValid) {
                    verification.errors.push('Digital signature is invalid');
                }
                // Check timestamp (not too old)
                const signatureAge = Date.now() / 1000 - decoded.iat;
                verification.checks.timestampValid = signatureAge < 365 * 24 * 60 * 60; // 1 year
                if (!verification.checks.timestampValid) {
                    verification.errors.push('Signature timestamp is too old');
                }
            }
            catch (jwtError) {
                verification.errors.push(`Signature verification failed: ${jwtError.message}`);
            }
        }
        else {
            verification.errors.push('No signature provided for verification');
        }
        // Verify integrity
        verification.checks.integrityValid =
            bundle.evidence && bundle.metadata && bundle.id;
        if (!verification.checks.integrityValid) {
            verification.errors.push('Bundle structure is invalid');
        }
        verification.valid = Object.values(verification.checks).every((check) => check === true);
    }
    catch (error) {
        verification.errors.push(`Verification error: ${error.message}`);
    }
    return verification;
}
async function getEvidenceBundle(evidenceId) {
    // In production, fetch from database or storage
    // For now, return a mock bundle based on the ID
    if (!evidenceId || !evidenceId.startsWith('evidence-')) {
        return null;
    }
    return generateEvidenceBundle('mock-run-id', 'mock-node-id', {
        includeArtifacts: true,
    });
}
