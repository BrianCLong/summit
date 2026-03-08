"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const CitationGate_1 = require("../../src/gates/CitationGate");
// Mock feature flag service
const mockIsEnabled = globals_1.jest.fn();
globals_1.jest.mock('../../src/services/FeatureFlagService', () => {
    return {
        getFeatureFlagService: () => ({
            isEnabled: mockIsEnabled
        }),
        FeatureFlagService: globals_1.jest.fn(),
        resetFeatureFlagService: globals_1.jest.fn()
    };
});
(0, globals_1.describe)('CitationGate', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('should pass through payload when flag is disabled', async () => {
        mockIsEnabled.mockResolvedValue(false);
        const payload = {
            findings: ['uncited finding']
        };
        const result = await CitationGate_1.CitationGate.validateCitations(payload, { tenantId: 'test' });
        (0, globals_1.expect)(result).toEqual(payload);
        (0, globals_1.expect)(result.findings).toHaveLength(1);
    });
    (0, globals_1.it)('should move uncited findings to gaps when flag is enabled', async () => {
        mockIsEnabled.mockResolvedValue(true);
        const payload = {
            findings: [
                'uncited finding',
                { text: 'cited finding', citations: [{ locator: 'doc-1' }] }
            ]
        };
        const result = await CitationGate_1.CitationGate.validateCitations(payload, { tenantId: 'test' });
        (0, globals_1.expect)(result.findings).toHaveLength(1);
        (0, globals_1.expect)(result.findings[0]).toEqual(payload.findings[1]);
        (0, globals_1.expect)(result.gaps).toBeDefined();
        (0, globals_1.expect)(result.gaps).toHaveLength(1);
        (0, globals_1.expect)(result.gaps[0]).toEqual({ text: 'uncited finding', citations: [] });
    });
    (0, globals_1.it)('should validate sections in ReportingService format', async () => {
        mockIsEnabled.mockResolvedValue(true);
        const payload = {
            sections: [
                {
                    name: 'executive_summary',
                    title: 'Executive Summary',
                    data: {
                        keyInsights: [
                            { description: 'uncited insight' },
                            { description: 'cited insight', citations: ['doc-2'] }
                        ]
                    }
                }
            ]
        };
        const result = await CitationGate_1.CitationGate.validateCitations(payload, { tenantId: 'test' });
        const summary = result.sections[0];
        (0, globals_1.expect)(summary.data.keyInsights).toHaveLength(1);
        (0, globals_1.expect)(summary.data.keyInsights[0].description).toBe('cited insight');
        // Check gaps appendix
        const gapsAppendix = result.sections.find(s => s.name === 'gaps_appendix');
        (0, globals_1.expect)(gapsAppendix).toBeDefined();
        (0, globals_1.expect)(gapsAppendix.data.gaps).toHaveLength(1);
        (0, globals_1.expect)(gapsAppendix.data.gaps[0].text).toBe('uncited insight');
    });
    (0, globals_1.it)('should throw error in strict mode if gaps are found', async () => {
        mockIsEnabled.mockResolvedValue(true);
        const payload = {
            findings: ['uncited finding']
        };
        await (0, globals_1.expect)(CitationGate_1.CitationGate.validateCitations(payload, { tenantId: 'test', strict: true }))
            .rejects.toThrow(/Export blocked/);
    });
});
