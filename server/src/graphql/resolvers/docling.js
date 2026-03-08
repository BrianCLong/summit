"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doclingResolvers = void 0;
const zod_1 = require("zod");
const DoclingService_js_1 = require("../../services/DoclingService.js");
const doclingRepository_js_1 = require("../../db/repositories/doclingRepository.js");
const SummarizeBuildFailureZ = zod_1.z.object({
    requestId: zod_1.z.string().min(8),
    buildId: zod_1.z.string().min(1),
    logText: zod_1.z.string().min(1),
    artifactUri: zod_1.z.string().url().optional(),
    retention: zod_1.z.enum(['SHORT', 'STANDARD']),
    purpose: zod_1.z.string().min(3),
    maxTokens: zod_1.z.number().int().positive().max(4096).optional(),
});
const ExtractLicensesZ = zod_1.z.object({
    requestId: zod_1.z.string().min(8),
    text: zod_1.z.string().min(1),
    retention: zod_1.z.enum(['SHORT', 'STANDARD']),
    purpose: zod_1.z.string().min(3),
    sourceType: zod_1.z.string().min(2),
    artifactUri: zod_1.z.string().url().optional(),
});
const ReleaseNotesZ = zod_1.z.object({
    requestId: zod_1.z.string().min(8),
    diffText: zod_1.z.string().min(1),
    retention: zod_1.z.enum(['SHORT', 'STANDARD']),
    purpose: zod_1.z.string().min(3),
});
const requireTenant = (ctx) => {
    const tenantId = ctx?.user?.tenantId || ctx?.tenantId || ctx?.req?.headers?.['x-tenant-id'];
    if (!tenantId) {
        throw new Error('Missing tenant scope');
    }
    return String(tenantId);
};
const mapRetention = (value) => value === 'SHORT' ? 'short' : 'standard';
exports.doclingResolvers = {
    Query: {
        async doclingSummary(_parent, args, ctx) {
            const tenantId = requireTenant(ctx);
            const record = await doclingRepository_js_1.doclingRepository.findSummaryByRequestId(tenantId, args.requestId);
            if (!record)
                return null;
            return {
                id: record.id,
                text: record.text,
                focus: record.focus,
                highlights: record.highlights || [],
                qualitySignals: record.qualitySignals || {},
            };
        },
    },
    Mutation: {
        async summarizeBuildFailure(_parent, args, ctx) {
            const tenantId = requireTenant(ctx);
            const parsed = SummarizeBuildFailureZ.safeParse(args.input || {});
            if (!parsed.success) {
                throw new Error(`Invalid input: ${parsed.error.message}`);
            }
            const payload = parsed.data;
            const result = await DoclingService_js_1.doclingService.summarizeBuildFailure({
                tenantId,
                buildId: payload.buildId,
                requestId: payload.requestId,
                logText: payload.logText,
                artifactUri: payload.artifactUri,
                retention: mapRetention(payload.retention),
                purpose: payload.purpose,
                maxTokens: payload.maxTokens,
            });
            return {
                summary: result.summary,
                fragments: result.fragments.map((fragment) => ({
                    id: fragment.id,
                    sha256: fragment.sha256,
                    text: fragment.text,
                    metadata: fragment.metadata,
                })),
                findings: result.findings.map((finding) => ({
                    id: finding.id,
                    label: finding.label,
                    value: finding.value,
                    confidence: finding.confidence,
                    severity: finding.severity,
                    fragmentId: finding.fragmentId,
                    qualitySignals: finding.metadata || finding.qualitySignals,
                })),
                policySignals: result.policySignals.map((signal) => ({
                    id: signal.id,
                    classification: signal.classification,
                    value: signal.value,
                    purpose: signal.purpose,
                    retention: signal.retention === 'short' ? 'SHORT' : 'STANDARD',
                    fragmentId: signal.fragmentId,
                    qualitySignals: signal.metadata?.qualitySignals || signal.qualitySignals,
                })),
            };
        },
        async extractLicenses(_parent, args, ctx) {
            const tenantId = requireTenant(ctx);
            const parsed = ExtractLicensesZ.safeParse(args.input || {});
            if (!parsed.success) {
                throw new Error(`Invalid input: ${parsed.error.message}`);
            }
            const payload = parsed.data;
            const result = await DoclingService_js_1.doclingService.extractLicenses({
                tenantId,
                requestId: payload.requestId,
                text: payload.text,
                retention: mapRetention(payload.retention),
                purpose: payload.purpose,
                sourceType: payload.sourceType,
                artifactUri: payload.artifactUri,
            });
            return {
                findings: result.findings.map((finding) => ({
                    id: finding.id,
                    label: finding.label,
                    value: finding.value,
                    confidence: finding.confidence,
                    severity: finding.severity,
                    fragmentId: finding.fragmentId,
                    qualitySignals: finding.metadata || finding.qualitySignals,
                })),
                policySignals: result.policySignals.map((signal) => ({
                    id: signal.id,
                    classification: signal.classification,
                    value: signal.value,
                    purpose: signal.purpose,
                    retention: signal.retention === 'short' ? 'SHORT' : 'STANDARD',
                    fragmentId: signal.fragmentId,
                    qualitySignals: signal.metadata?.qualitySignals || signal.qualitySignals,
                })),
            };
        },
        async generateReleaseNotes(_parent, args, ctx) {
            const tenantId = requireTenant(ctx);
            const parsed = ReleaseNotesZ.safeParse(args.input || {});
            if (!parsed.success) {
                throw new Error(`Invalid input: ${parsed.error.message}`);
            }
            const payload = parsed.data;
            const result = await DoclingService_js_1.doclingService.generateReleaseNotes({
                tenantId,
                requestId: payload.requestId,
                diffText: payload.diffText,
                retention: mapRetention(payload.retention),
                purpose: payload.purpose,
            });
            return {
                summary: result.summary,
            };
        },
    },
};
