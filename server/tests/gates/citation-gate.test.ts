import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { CitationGate, ExportPayload } from '../../src/gates/CitationGate';
import { FeatureFlagService, getFeatureFlagService, resetFeatureFlagService } from '../../src/services/FeatureFlagService';

// Mock feature flag service
const mockIsEnabled = jest.fn();

jest.mock('../../src/services/FeatureFlagService', () => {
    return {
        getFeatureFlagService: () => ({
            isEnabled: mockIsEnabled
        }),
        FeatureFlagService: jest.fn(),
        resetFeatureFlagService: jest.fn()
    };
});

describe('CitationGate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should pass through payload when flag is disabled', async () => {
        mockIsEnabled.mockResolvedValue(false);
        const payload: ExportPayload = {
            findings: ['uncited finding']
        };

        const result = await CitationGate.validateCitations(payload, { tenantId: 'test' });
        expect(result).toEqual(payload);
        expect(result.findings).toHaveLength(1);
    });

    it('should move uncited findings to gaps when flag is enabled', async () => {
        mockIsEnabled.mockResolvedValue(true);
        const payload: ExportPayload = {
            findings: [
                'uncited finding',
                { text: 'cited finding', citations: [{ locator: 'doc-1' }] }
            ]
        };

        const result = await CitationGate.validateCitations(payload, { tenantId: 'test' });

        expect(result.findings).toHaveLength(1);
        expect(result.findings![0]).toEqual(payload.findings![1]);

        expect(result.gaps).toBeDefined();
        expect(result.gaps).toHaveLength(1);
        expect(result.gaps![0]).toEqual({ text: 'uncited finding', citations: [] });
    });

    it('should validate sections in ReportingService format', async () => {
        mockIsEnabled.mockResolvedValue(true);
        const payload: ExportPayload = {
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

        const result = await CitationGate.validateCitations(payload, { tenantId: 'test' });

        const summary = result.sections![0];
        expect(summary.data.keyInsights).toHaveLength(1);
        expect(summary.data.keyInsights[0].description).toBe('cited insight');

        // Check gaps appendix
        const gapsAppendix = result.sections!.find(s => s.name === 'gaps_appendix');
        expect(gapsAppendix).toBeDefined();
        expect(gapsAppendix!.data.gaps).toHaveLength(1);
        expect(gapsAppendix!.data.gaps[0].text).toBe('uncited insight');
    });

    it('should throw error in strict mode if gaps are found', async () => {
        mockIsEnabled.mockResolvedValue(true);
        const payload: ExportPayload = {
            findings: ['uncited finding']
        };

        await expect(CitationGate.validateCitations(payload, { tenantId: 'test', strict: true }))
            .rejects.toThrow(/Export blocked/);
    });
});
