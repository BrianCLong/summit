"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = require("fs");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const claims_repository_js_1 = require("../claims-repository.js");
const gtm_messaging_service_js_1 = require("../gtm-messaging-service.js");
const types_js_1 = require("../types.js");
const createService = async () => {
    const tempDir = (0, fs_1.mkdtempSync)(path_1.default.join(os_1.default.tmpdir(), 'gtm-claims-'));
    const repository = new claims_repository_js_1.ClaimsRepository(tempDir);
    await repository.init();
    const service = new gtm_messaging_service_js_1.GtmMessagingService(repository);
    return { service, repository };
};
(0, globals_1.describe)('GtmMessagingService', () => {
    (0, globals_1.it)('enforces high-risk approval workflow', async () => {
        const { service } = await createService();
        const { claim, enforcement } = await service.submitClaim({
            message: 'Forward-looking roadmap claim',
            evidenceType: types_js_1.EvidenceType.DemoVideo,
            evidenceSource: 'Roadmap demo',
            owner: 'PMM',
            channels: ['web', 'sales'],
            riskTier: types_js_1.RiskTier.High,
            forwardLooking: true,
            complianceSurface: ['security'],
        });
        (0, globals_1.expect)(claim.status).toBe(types_js_1.ClaimStatus.Pending);
        (0, globals_1.expect)(enforcement).toEqual(globals_1.expect.arrayContaining(['legal approval', 'security approval', 'pmm final approval']));
        await service.recordApproval(claim.claimId, 'legal');
        await service.recordApproval(claim.claimId, 'security');
        const approved = await service.recordApproval(claim.claimId, 'pmm');
        (0, globals_1.expect)(approved.status).toBe(types_js_1.ClaimStatus.Approved);
        (0, globals_1.expect)(approved.publishedAt).toBeDefined();
    });
    (0, globals_1.it)('expires claims past review date', async () => {
        const { service, repository } = await createService();
        const { claim } = await service.submitClaim({
            message: 'Customer metric proof with SLA',
            evidenceType: types_js_1.EvidenceType.CustomerMetric,
            evidenceSource: 'Case study',
            owner: 'Marketing',
            channels: ['content'],
            riskTier: types_js_1.RiskTier.Low,
            reviewDate: '2000-01-01T00:00:00.000Z',
        });
        await service.recordApproval(claim.claimId, 'pmm');
        const expired = await service.expireClaims(new Date('2001-01-01T00:00:00.000Z'));
        (0, globals_1.expect)(expired).toHaveLength(1);
        const stored = (await repository.loadClaims())[0];
        (0, globals_1.expect)(stored.status).toBe(types_js_1.ClaimStatus.Expired);
    });
    (0, globals_1.it)('produces templates, KPIs, and enablement assets aligned to governance guardrails', async () => {
        const { service } = await createService();
        const templates = service.getContentTemplates();
        (0, globals_1.expect)(templates.find((t) => t.type === 'case_study')?.proofRequirements).toContain('Named customer metric');
        const kpis = service.getWebsiteKpis();
        (0, globals_1.expect)(kpis.find((kpi) => kpi.page === 'home')?.abGuardrails).toContain('Sample size calculator required');
        const enablement = service.getEnablementAssets();
        (0, globals_1.expect)(enablement.find((asset) => asset.role === 'ae' && asset.assetType === 'battlecard')?.forbiddenPhrases).toContain('perfect security');
    });
    (0, globals_1.it)('builds an execution checklist and evidence graph from approved claims', async () => {
        const { service } = await createService();
        const { claim } = await service.submitClaim({
            message: 'Evidence-grade reporting SLA',
            evidenceType: types_js_1.EvidenceType.Sla,
            evidenceSource: 'SLA posture',
            owner: 'Legal',
            channels: ['web'],
            riskTier: types_js_1.RiskTier.Medium,
        });
        await service.recordApproval(claim.claimId, 'pmm');
        const claims = await service.listClaimsForChannel('web');
        const checklist = service.buildExecutionChecklist(claims);
        (0, globals_1.expect)(checklist.find((item) => item.id === 'claims_library')?.completed).toBe(true);
        const graph = service.buildEvidenceGraph(claims);
        (0, globals_1.expect)(graph).toHaveLength(1);
        (0, globals_1.expect)(graph[0].claimId).toBe(claim.claimId);
    });
    (0, globals_1.it)('evaluates channel performance against playbook thresholds', async () => {
        const { service } = await createService();
        const result = service.evaluateChannelPerformance({
            channel: 'content',
            cac: 400,
            paybackMonths: 3,
            pipelineVelocity: 0.2,
        });
        (0, globals_1.expect)(result.healthy).toBe(true);
        (0, globals_1.expect)(result.recommendation).toBe('double_down');
    });
    (0, globals_1.it)('routes personas adaptively based on intent and behavior', async () => {
        const { service } = await createService();
        const route = service.decideAdaptiveRoute({ behavioralScore: 0.8, firmographic: 'enterprise', intentLevel: 'high' });
        (0, globals_1.expect)(route).toBe('enterprise-contact');
    });
    (0, globals_1.it)('flags unapproved claims and forbidden phrases through QA scanning', async () => {
        const { service } = await createService();
        const approved = await service.submitClaim({
            message: 'Approved governance proof',
            evidenceType: types_js_1.EvidenceType.ProductTelemetry,
            evidenceSource: 'Telemetry dataset',
            owner: 'Ops',
            channels: ['web'],
            riskTier: types_js_1.RiskTier.Low,
        });
        await service.recordApproval(approved.claim.claimId, 'pmm');
        await service.submitClaim({
            message: 'Unapproved forward-looking statement',
            evidenceType: types_js_1.EvidenceType.DemoVideo,
            evidenceSource: 'Future demo',
            owner: 'PMM',
            channels: ['web'],
            riskTier: types_js_1.RiskTier.High,
            forwardLooking: true,
        });
        const qa = await service.closedLoopQa('This asset cites an Unapproved forward-looking statement and promises guaranteed outcomes while covering the approved governance proof.');
        (0, globals_1.expect)(qa.violations).toEqual(globals_1.expect.arrayContaining([
            globals_1.expect.stringContaining('Unapproved claim referenced'),
            'Forbidden phrase detected: guaranteed',
        ]));
    });
});
