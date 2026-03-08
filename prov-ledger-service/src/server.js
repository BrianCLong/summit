"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const fastify_1 = __importDefault(require("fastify"));
const zod_1 = require("zod");
const ledger_1 = require("./ledger");
const receipts_1 = require("./receipts");
const receiptBundle_1 = require("./export/receiptBundle");
const provenance_1 = require("@intelgraph/provenance");
const tar_stream_1 = __importDefault(require("tar-stream"));
const zlib_1 = require("zlib");
const promises_1 = require("stream/promises");
const bundleAssembler_1 = require("./export/bundleAssembler");
// Note: In production, this would import from the actual OPA client service
// For now, we'll create a simplified local version
const app = (0, fastify_1.default)({ logger: true });
async function evaluateExportPolicy(input) {
    const violations = [];
    let requires_approval = false;
    let requires_step_up = false;
    // Check each source license
    for (const source of input.dataset.sources) {
        // Blocked licenses
        if (['DISALLOW_EXPORT', 'VIEW_ONLY', 'SEAL_ONLY', 'EMBARGOED'].includes(source.license)) {
            violations.push({
                code: 'LICENSE_VIOLATION',
                message: `Export blocked by license ${source.license} for source ${source.id}`,
                appeal_code: 'LIC001',
                appeal_url: 'https://compliance.intelgraph.io/appeal/LIC001',
                severity: 'blocking',
            });
        }
        // Commercial purpose restrictions
        if (input.context.purpose === 'commercial' &&
            ['GPL-3.0', 'AGPL-3.0', 'CC-BY-NC'].includes(source.license)) {
            violations.push({
                code: 'COMMERCIAL_USE_VIOLATION',
                message: `Commercial use not permitted for license ${source.license}`,
                appeal_code: 'COM001',
                appeal_url: 'https://compliance.intelgraph.io/appeal/COM001',
                severity: 'blocking',
            });
        }
        // Approval requirements
        if (['GPL-3.0', 'AGPL-3.0'].includes(source.license) &&
            input.context.export_type === 'dataset') {
            requires_approval = true;
        }
        // Step-up requirements for sensitive data
        if (source.classification === 'restricted' ||
            source.classification === 'confidential') {
            requires_step_up = true;
        }
    }
    // Check user permissions
    if (!['analyst', 'investigator', 'admin', 'compliance-officer'].includes(input.context.user_role)) {
        violations.push({
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'User role does not have export permissions',
            appeal_code: 'AUTH001',
            appeal_url: 'https://compliance.intelgraph.io/appeal/AUTH001',
            severity: 'blocking',
        });
    }
    // Check step-up authentication
    if (requires_step_up && !input.context.step_up_verified) {
        violations.push({
            code: 'STEP_UP_REQUIRED',
            message: 'Step-up authentication required for sensitive data export',
            appeal_code: 'AUTH002',
            appeal_url: 'https://compliance.intelgraph.io/appeal/AUTH002',
            severity: 'blocking',
        });
    }
    // Check approvals
    if (requires_approval &&
        (!input.context.approvals ||
            !input.context.approvals.includes('compliance-officer'))) {
        violations.push({
            code: 'APPROVAL_REQUIRED',
            message: 'Compliance officer approval required for this export',
            appeal_code: 'APP001',
            appeal_url: 'https://compliance.intelgraph.io/appeal/APP001',
            severity: 'blocking',
        });
    }
    const blockingViolations = violations.filter((v) => v.severity === 'blocking');
    const allow = blockingViolations.length === 0;
    return {
        allow,
        violations,
        requires_approval,
        requires_step_up,
    };
}
const evidenceSchema = zod_1.z.object({
    contentHash: zod_1.z.string(),
    licenseId: zod_1.z.string(),
    source: zod_1.z.string(),
    transforms: zod_1.z.array(zod_1.z.string()).default([]),
});
app.post('/evidence/register', async (req, reply) => {
    const body = evidenceSchema.parse(req.body);
    const evid = (0, ledger_1.registerEvidence)({ ...body });
    reply.send({ evidenceId: evid.id });
});
const claimSchema = zod_1.z.object({
    evidenceId: zod_1.z.array(zod_1.z.string()),
    text: zod_1.z.string(),
    confidence: zod_1.z.number(),
    links: zod_1.z.array(zod_1.z.string()).default([]),
    caseId: zod_1.z.string().optional(),
    actor: zod_1.z
        .object({
        id: zod_1.z.string(),
        role: zod_1.z.string(),
        tenantId: zod_1.z.string().optional(),
    })
        .optional(),
    pipeline: zod_1.z
        .object({
        stage: zod_1.z.string().optional(),
        runId: zod_1.z.string().optional(),
        taskId: zod_1.z.string().optional(),
        step: zod_1.z.string().optional(),
    })
        .optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    redactions: zod_1.z
        .array(zod_1.z.object({ path: zod_1.z.string(), reason: zod_1.z.string() }))
        .optional(),
});
app.post('/claims', async (req, reply) => {
    const body = claimSchema.parse(req.body);
    const claim = (0, ledger_1.createClaim)({
        evidenceIds: body.evidenceId,
        text: body.text,
        confidence: body.confidence,
        links: body.links,
    });
    const manifest = (0, ledger_1.buildManifest)([claim.id]);
    const receipt = await (0, receipts_1.issueReceipt)(manifest, {
        caseId: body.caseId ?? claim.id,
        claimIds: [claim.id],
        actor: body.actor ?? { id: 'system', role: 'system' },
        pipeline: body.pipeline,
        metadata: body.metadata,
        redactions: body.redactions,
    });
    reply.send({
        claimId: claim.id,
        receiptId: receipt.id,
        receiptValid: (0, provenance_1.verifyReceiptSignature)(receipt),
    });
});
const exportSchema = zod_1.z.object({ claimId: zod_1.z.array(zod_1.z.string()) });
const redactionSchema = zod_1.z.object({
    path: zod_1.z.string(),
    reason: zod_1.z.string(),
});
const receiptExportSchema = zod_1.z.object({
    receiptIds: zod_1.z.array(zod_1.z.string()),
    includeProvenance: zod_1.z.boolean().default(false),
    redactions: zod_1.z.array(redactionSchema).optional(),
});
// Get provenance chain for evidence or claim
app.get('/prov/evidence/:id', async (req, reply) => {
    const { id } = req.params;
    const provenance = (0, ledger_1.getProvenance)(id);
    if (!provenance) {
        reply.status(404).send({ error: 'Evidence not found' });
        return;
    }
    reply.send(provenance);
});
// Record a transform operation
const transformSchema = zod_1.z.object({
    inputIds: zod_1.z.array(zod_1.z.string()),
    outputId: zod_1.z.string(),
    operation: zod_1.z.string(),
    parameters: zod_1.z.record(zod_1.z.any()).optional(),
    timestamp: zod_1.z.string().optional(),
});
app.post('/prov/transform', async (req, reply) => {
    const body = transformSchema.parse(req.body);
    const transform = (0, ledger_1.recordTransform)({
        ...body,
        timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
    });
    reply.send({ transformId: transform.id });
});
app.get('/receipts/:id', async (req, reply) => {
    const { id } = req.params;
    const receipt = (0, receipts_1.getReceipt)(id);
    if (!receipt) {
        reply.status(404).send({ error: 'Receipt not found' });
        return;
    }
    const { redact } = (req.query ?? {});
    const result = redact === 'true' ? (0, receipts_1.redactReceipt)(receipt) : receipt;
    reply.send({
        receipt: result,
        valid: (0, provenance_1.verifyReceiptSignature)(receipt),
    });
});
app.post('/receipts/export', async (req, reply) => {
    const body = receiptExportSchema.parse(req.body);
    const receipts = (0, receipts_1.listReceipts)(body.receiptIds);
    if (receipts.length === 0) {
        reply.status(404).send({ error: 'Receipts not found' });
        return;
    }
    const stream = (0, receiptBundle_1.assembleReceiptBundle)({
        receipts,
        redactions: body.redactions,
        includeProvenance: body.includeProvenance,
        provenanceFetcher: (id) => (0, ledger_1.getProvenance)(id),
    });
    reply.header('Content-Type', 'application/gzip');
    reply.header('Content-Disposition', 'attachment; filename="receipts-bundle.tgz"');
    reply.send(stream);
});
// Enhanced export schema with policy context
const enhancedExportSchema = zod_1.z.object({
    claimId: zod_1.z.array(zod_1.z.string()),
    context: zod_1.z.object({
        user_id: zod_1.z.string(),
        user_role: zod_1.z.string(),
        tenant_id: zod_1.z.string(),
        purpose: zod_1.z.string(),
        export_type: zod_1.z.enum(['analysis', 'report', 'dataset', 'api']),
        approvals: zod_1.z.array(zod_1.z.string()).optional(),
        step_up_verified: zod_1.z.boolean().optional(),
    }),
    receipts: zod_1.z
        .array(zod_1.z.object({
        id: zod_1.z.string(),
        subject: zod_1.z.string(),
        type: zod_1.z.string(),
        issuedAt: zod_1.z.string(),
        actor: zod_1.z.string().optional(),
        payload: zod_1.z.record(zod_1.z.any()),
    }))
        .optional(),
    policyDecisions: zod_1.z
        .array(zod_1.z.object({
        id: zod_1.z.string(),
        decision: zod_1.z.enum(['allow', 'deny', 'review']),
        rationale: zod_1.z.string(),
        policy: zod_1.z.string(),
        createdAt: zod_1.z.string(),
        attributes: zod_1.z.record(zod_1.z.any()).optional(),
    }))
        .optional(),
    redaction: zod_1.z
        .object({
        allowReceiptIds: zod_1.z.array(zod_1.z.string()).optional(),
        redactFields: zod_1.z.array(zod_1.z.string()).optional(),
        maskFields: zod_1.z.array(zod_1.z.string()).optional(),
    })
        .optional(),
});
// Export with enhanced policy enforcement
app.post('/prov/export/:caseId', async (req, reply) => {
    const { caseId } = req.params;
    const body = enhancedExportSchema.parse(req.body);
    try {
        const manifest = (0, ledger_1.buildManifest)(body.claimId);
        // Prepare OPA policy input
        const policyInput = {
            action: 'export',
            dataset: {
                sources: manifest.claims.map((claim) => {
                    const storedClaim = (0, ledger_1.getClaim)(claim.id);
                    const firstEvidenceId = storedClaim?.evidenceIds?.[0];
                    const evidence = firstEvidenceId ? (0, ledger_1.getEvidence)(firstEvidenceId) : null;
                    return {
                        id: claim.id,
                        license: evidence?.licenseId || 'UNKNOWN',
                        owner: evidence?.source || 'unknown',
                        classification: 'standard', // TODO: Get actual classification
                    };
                }),
            },
            context: body.context,
        };
        // Evaluate export policy
        const policyDecision = await evaluateExportPolicy(policyInput);
        if (!policyDecision.allow) {
            const response = {
                error: 'Export denied by policy',
                violations: policyDecision.violations,
                requires_approval: policyDecision.requires_approval,
                requires_step_up: policyDecision.requires_step_up,
                appeal_instructions: 'Use the appeal URLs provided in violations to request manual review',
            };
            app.log.warn({
                caseId,
                userId: body.context.user_id,
                violations: policyDecision.violations.map((v) => v.code),
            }, 'Export denied by policy');
            reply.status(403).send(response);
            return;
        }
        // Enhanced manifest with provenance chains
        const evidenceAttachments = {};
        for (const claim of manifest.claims) {
            const provenance = (0, ledger_1.getProvenance)(claim.id);
            if (provenance) {
                evidenceAttachments[`evidence/${claim.id}.json`] = provenance;
            }
        }
        const { stream, metadata, manifest: bundleManifest } = (0, bundleAssembler_1.assembleExportBundle)({
            manifest: {
                ...manifest,
                caseId,
                generatedAt: new Date().toISOString(),
                version: '1.0.0',
                provenance: {
                    evidenceChains: manifest.claims.map((claim) => ({
                        claimId: claim.id,
                        evidence: (0, ledger_1.getProvenance)(claim.id),
                    })),
                },
            },
            receipts: body.receipts ?? [],
            policyDecisions: body.policyDecisions ?? [],
            redaction: body.redaction ?? undefined,
            attachments: evidenceAttachments,
        });
        reply.header('Content-Type', 'application/gzip');
        reply.header('Content-Disposition', `attachment; filename="case-${caseId}-bundle.tgz"`);
        reply.header('X-Redaction-Applied', metadata.redaction.applied ? 'true' : 'false');
        reply.header('X-Receipt-Count', metadata.counts.receipts.toString());
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        stream.on('error', (err) => app.log.error({ err }, 'bundle stream error'));
        await (0, promises_1.finished)(stream);
        reply.send(Buffer.concat(chunks));
    }
    catch (error) {
        app.log.error({ error, caseId }, 'Export generation failed');
        reply.status(500).send({ error: 'Export generation failed' });
    }
});
// Legacy export endpoint
app.post('/exports', async (req, reply) => {
    const body = exportSchema.parse(req.body);
    const manifest = (0, ledger_1.buildManifest)(body.claimId);
    const licenseCheck = (0, ledger_1.checkLicenses)(manifest.licenses);
    if (!licenseCheck.valid) {
        reply.status(400).send({
            error: licenseCheck.reason,
            appealCode: licenseCheck.appealCode,
        });
        return;
    }
    const pack = tar_stream_1.default.pack();
    pack.entry({ name: 'manifest.json' }, JSON.stringify(manifest, null, 2));
    pack.finalize();
    reply.header('Content-Type', 'application/gzip');
    reply.header('Content-Disposition', 'attachment; filename="bundle.tgz"');
    reply.send(pack.pipe((0, zlib_1.createGzip)()));
});
if (require.main === module) {
    app.listen({ port: 3000, host: '0.0.0.0' }).catch((err) => {
        app.log.error(err);
        process.exit(1);
    });
}
exports.default = app;
