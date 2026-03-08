"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const RegulationFeedMonitor_js_1 = require("../agents/RegulationFeedMonitor.js");
const RegulationAnalysisAgent_js_1 = require("../agents/RegulationAnalysisAgent.js");
const ComplianceImpactAssessor_js_1 = require("../agents/ComplianceImpactAssessor.js");
const WorkflowAdaptationAgent_js_1 = require("../agents/WorkflowAdaptationAgent.js");
(0, vitest_1.describe)('RegulationFeedMonitor', () => {
    let monitor;
    (0, vitest_1.beforeEach)(() => {
        monitor = new RegulationFeedMonitor_js_1.RegulationFeedMonitor();
    });
    (0, vitest_1.it)('should register a regulation source', () => {
        monitor.registerSource({
            id: 'test-source',
            name: 'Test Source',
            type: 'rss',
            url: 'https://example.com/feed.rss',
            jurisdiction: 'US',
            categories: ['test'],
            pollingIntervalMinutes: 60,
            enabled: true,
        });
        const stats = monitor.getStats();
        (0, vitest_1.expect)(stats.sourcesRegistered).toBe(1);
    });
    (0, vitest_1.it)('should emit events when regulations are detected', async () => {
        const eventPromise = new Promise((resolve) => {
            monitor.on('regulation_detected', () => resolve());
        });
        // Manually trigger (normally from RSS fetch)
        monitor.emit('regulation_detected', {
            id: 'test',
            type: 'regulation_detected',
            payload: { id: 'reg-1', title: 'Test Regulation' },
            timestamp: new Date(),
            agentId: 'test',
        });
        await eventPromise;
    });
});
(0, vitest_1.describe)('RegulationAnalysisAgent', () => {
    let agent;
    (0, vitest_1.beforeEach)(() => {
        agent = new RegulationAnalysisAgent_js_1.RegulationAnalysisAgent();
    });
    (0, vitest_1.it)('should analyze regulation with rule-based fallback', async () => {
        const regulation = {
            id: 'test-reg',
            sourceId: 'source-1',
            externalId: 'ext-1',
            title: 'GDPR Amendment for AI Data Processing',
            summary: 'New requirements for personal data processing in AI systems',
            jurisdiction: 'EU',
            regulatoryBody: 'European Commission',
            categories: ['gdpr', 'ai'],
            publishedDate: new Date(),
            status: 'proposed',
            url: 'https://eur-lex.europa.eu/test',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const result = await agent.analyzeRegulation(regulation);
        (0, vitest_1.expect)(result.regulationId).toBe('test-reg');
        (0, vitest_1.expect)(result.classification.primaryCategory).toBe('data_privacy');
        (0, vitest_1.expect)(result.confidence).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.analyzedAt).toBeInstanceOf(Date);
    });
    (0, vitest_1.it)('should detect cross-border implications for EU regulations', async () => {
        const regulation = {
            id: 'eu-reg',
            sourceId: 'source-1',
            externalId: 'ext-1',
            title: 'EU Digital Services Act Update',
            jurisdiction: 'EU',
            regulatoryBody: 'European Commission',
            categories: ['digital'],
            publishedDate: new Date(),
            status: 'final',
            url: 'https://eur-lex.europa.eu/dsa',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const result = await agent.analyzeRegulation(regulation);
        (0, vitest_1.expect)(result.crossBorderImplications.hasImplications).toBe(true);
        (0, vitest_1.expect)(result.crossBorderImplications.affectedJurisdictions).toContain('EU');
    });
});
(0, vitest_1.describe)('ComplianceImpactAssessor', () => {
    let assessor;
    (0, vitest_1.beforeEach)(() => {
        // Mock pool
        const mockPool = {
            query: vitest_1.vi.fn().mockResolvedValue({ rows: [] }),
        };
        assessor = new ComplianceImpactAssessor_js_1.ComplianceImpactAssessor(mockPool);
    });
    (0, vitest_1.it)('should assess impact and generate risk score', async () => {
        const regulation = {
            id: 'test-reg',
            sourceId: 'source-1',
            externalId: 'ext-1',
            title: 'Data Protection Amendment',
            jurisdiction: 'US',
            regulatoryBody: 'FTC',
            categories: ['privacy'],
            publishedDate: new Date(),
            status: 'final',
            url: 'https://ftc.gov/test',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const analysis = {
            classification: {
                primaryCategory: 'data_privacy',
                subcategories: [],
                industries: ['technology'],
                dataTypes: ['personal_data'],
            },
            keyRequirements: [
                {
                    id: 'REQ-001',
                    requirement: 'Implement consent management',
                    mandatory: true,
                },
            ],
            crossBorderImplications: {
                hasImplications: false,
                affectedJurisdictions: ['US'],
            },
        };
        const assessment = await assessor.assessImpact(regulation, analysis);
        (0, vitest_1.expect)(assessment.regulationId).toBe('test-reg');
        (0, vitest_1.expect)(assessment.riskScore).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(assessment.riskScore).toBeLessThanOrEqual(100);
        (0, vitest_1.expect)(assessment.severity).toMatch(/critical|high|medium|low|informational/);
        (0, vitest_1.expect)(assessment.impactAreas.length).toBeGreaterThanOrEqual(0);
    });
    (0, vitest_1.it)('should determine severity based on risk score', async () => {
        await assessor.loadSystemInventory();
        const regulation = {
            id: 'critical-reg',
            sourceId: 'source-1',
            externalId: 'ext-1',
            title: 'Major Data Breach Notification Requirements',
            jurisdiction: 'EU',
            regulatoryBody: 'EDPB',
            categories: ['gdpr'],
            publishedDate: new Date(),
            status: 'effective',
            url: 'https://edpb.europa.eu/test',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const analysis = {
            classification: {
                primaryCategory: 'data_privacy',
                subcategories: ['breach_notification'],
                industries: ['all'],
                dataTypes: ['personal_data', 'sensitive_data'],
            },
            keyRequirements: [
                { id: 'REQ-001', requirement: 'Notify authorities within 72 hours of breach', mandatory: true },
                { id: 'REQ-002', requirement: 'Implement audit logging for all data access', mandatory: true },
                { id: 'REQ-003', requirement: 'Annual retention policy review', mandatory: true },
            ],
            crossBorderImplications: {
                hasImplications: true,
                affectedJurisdictions: ['EU', 'UK', 'US'],
            },
        };
        const assessment = await assessor.assessImpact(regulation, analysis);
        (0, vitest_1.expect)(assessment.riskScore).toBeGreaterThan(40); // Should be medium or higher
    });
});
(0, vitest_1.describe)('WorkflowAdaptationAgent', () => {
    let agent;
    (0, vitest_1.beforeEach)(() => {
        const mockPool = {
            query: vitest_1.vi.fn().mockResolvedValue({ rows: [] }),
        };
        agent = new WorkflowAdaptationAgent_js_1.WorkflowAdaptationAgent(mockPool);
    });
    (0, vitest_1.it)('should generate adaptations from impact assessment', async () => {
        const regulation = {
            id: 'test-reg',
            sourceId: 'source-1',
            externalId: 'ext-1',
            title: 'Consent Management Update',
            jurisdiction: 'EU',
            regulatoryBody: 'EDPB',
            categories: ['gdpr'],
            publishedDate: new Date(),
            status: 'final',
            url: 'https://edpb.europa.eu/test',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const assessment = {
            id: 'assess-1',
            regulationId: 'test-reg',
            severity: 'medium',
            riskScore: 45,
            impactAreas: [
                {
                    area: 'Business Workflows',
                    description: 'Consent workflows need updates',
                    affectedSystems: ['Customer Onboarding'],
                    requiredActions: ['Add consent verification step'],
                },
            ],
            complianceGaps: [
                {
                    gapId: 'gap-1',
                    description: 'Consent mechanism may not meet new requirements',
                    currentState: 'Basic consent',
                    requiredState: 'Granular consent',
                    remediationSteps: ['Implement granular consent'],
                    estimatedEffort: '2 weeks',
                },
            ],
            autoRemediationPossible: true,
            recommendedActions: ['Update consent workflow'],
            assessedAt: new Date(),
            assessedBy: 'ai',
        };
        const adaptations = await agent.generateAdaptations(regulation, assessment);
        (0, vitest_1.expect)(adaptations.length).toBeGreaterThan(0);
        // Should have at least notification adaptation
        const notificationAdaptation = adaptations.find(a => a.adaptationType === 'notification_rule');
        (0, vitest_1.expect)(notificationAdaptation).toBeDefined();
        (0, vitest_1.expect)(notificationAdaptation?.status).toBe('approved'); // Notifications auto-approved
    });
    (0, vitest_1.it)('should approve and apply adaptations', async () => {
        const regulation = {
            id: 'test-reg-2',
            sourceId: 'source-1',
            externalId: 'ext-2',
            title: 'Test Regulation',
            jurisdiction: 'US',
            regulatoryBody: 'Test',
            categories: [],
            publishedDate: new Date(),
            status: 'final',
            url: 'https://test.gov',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const assessment = {
            id: 'assess-2',
            regulationId: 'test-reg-2',
            severity: 'low',
            riskScore: 20,
            impactAreas: [],
            complianceGaps: [],
            autoRemediationPossible: true,
            recommendedActions: [],
            assessedAt: new Date(),
            assessedBy: 'ai',
        };
        const adaptations = await agent.generateAdaptations(regulation, assessment);
        const pendingAdaptation = adaptations.find(a => a.status === 'pending');
        if (pendingAdaptation) {
            const approved = agent.approveAdaptation(pendingAdaptation.id, 'test-user');
            (0, vitest_1.expect)(approved).toBe(true);
            const applied = await agent.applyAdaptation(pendingAdaptation.id);
            (0, vitest_1.expect)(applied).toBe(true);
        }
    });
});
