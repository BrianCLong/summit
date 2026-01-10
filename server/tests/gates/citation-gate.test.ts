import { CitationGate, ExportPayload } from '../../src/gates/CitationGate';

// Mock feature flag service
const mockIsEnabled = jest.fn();

jest.mock('../../src/services/FeatureFlagService', () => {
  return {
    getFeatureFlagService: () => ({
      isEnabled: mockIsEnabled,
    }),
    FeatureFlagService: jest.fn(),
    resetFeatureFlagService: jest.fn(),
  };
});

describe('CitationGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = '';
  });

  it('should still surface gaps when flag is disabled', async () => {
    mockIsEnabled.mockResolvedValue(false);
    const payload: ExportPayload = {
      findings: ['uncited finding'],
    };

    const result = await CitationGate.validateCitations(payload, {
      tenantId: 'test',
    });
    expect(result.findings).toHaveLength(0);
    expect(result.gaps).toHaveLength(1);
  });

  it('should block uncited findings when flag is enabled', async () => {
    mockIsEnabled.mockResolvedValue(true);
    const payload: ExportPayload = {
      findings: [
        'uncited finding',
        { text: 'cited finding', citations: [{ locator: 'doc-1' }] },
      ],
    };

    await expect(
      CitationGate.validateCitations(payload, { tenantId: 'test' }),
    ).rejects.toThrow(/Export blocked/);
  });

  it('should block uncited reporting sections when gate is enabled', async () => {
    mockIsEnabled.mockResolvedValue(true);
    const payload: ExportPayload = {
      sections: [
        {
          name: 'executive_summary',
          title: 'Executive Summary',
          data: {
            keyInsights: [
              { description: 'uncited insight' },
              { description: 'cited insight', citations: ['doc-2'] },
            ],
          },
        },
      ],
    };

    await expect(
      CitationGate.validateCitations(payload, { tenantId: 'test' }),
    ).rejects.toThrow(/Export blocked/);
  });

  it('should throw error in strict mode if gaps are found', async () => {
    mockIsEnabled.mockResolvedValue(true);
    const payload: ExportPayload = {
      findings: ['uncited finding'],
    };

    await expect(
      CitationGate.validateCitations(payload, {
        tenantId: 'test',
        strict: true,
      }),
    ).rejects.toThrow(/Export blocked/);
  });

  it('enforces gating in production builds even without strict flag', async () => {
    process.env.NODE_ENV = 'production';
    mockIsEnabled.mockResolvedValue(false);
    const payload: ExportPayload = {
      findings: ['uncited finding'],
    };

    await expect(
      CitationGate.validateCitations(payload, { tenantId: 'test' }),
    ).rejects.toThrow(/Export blocked/);
  });
});
