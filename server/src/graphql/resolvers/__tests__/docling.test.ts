import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

jest.unstable_mockModule(
  new URL('../../../services/DoclingService.ts', import.meta.url).pathname,
  () => ({
    doclingService: {
      summarizeBuildFailure: jest.fn(),
    },
  }),
);

jest.unstable_mockModule(
  new URL('../../../db/repositories/doclingRepository.ts', import.meta.url)
    .pathname,
  () => ({
    doclingRepository: {
      findSummaryByRequestId: jest.fn(),
    },
  }),
);

describe('docling resolvers', () => {
  const ctx = { user: { tenantId: 'tenant-1' } };
  let doclingResolvers: typeof import('../docling.js').doclingResolvers;
  let doclingService: { summarizeBuildFailure: jest.Mock };
  let doclingRepository: { findSummaryByRequestId: jest.Mock };

  beforeAll(async () => {
    ({ doclingResolvers } = await import('../docling.js'));
    ({ doclingService } = await import('../../../services/DoclingService.js'));
    ({ doclingRepository } = await import('../../../db/repositories/doclingRepository.js'));
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('calls service for summarizeBuildFailure', async () => {
    (doclingService as any).summarizeBuildFailure.mockResolvedValue({
      summary: {
        id: 's1',
        text: 'ok',
        focus: 'failures',
        highlights: [],
        qualitySignals: {},
      },
      fragments: [{ id: 'f1', sha256: 'abc', text: 'fragment', metadata: {} }],
      findings: [],
      policySignals: [],
    });

    const result = await doclingResolvers.Mutation.summarizeBuildFailure(
      {},
      {
        input: {
          requestId: 'req-12345',
          buildId: 'build-1',
          logText: 'fail',
          retention: 'SHORT',
          purpose: 'investigation',
        },
      },
      ctx,
    );

    expect(doclingService.summarizeBuildFailure).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', retention: 'short' }),
    );
    expect(result.summary.id).toBe('s1');
  });

  it('fetches stored summary', async () => {
    (doclingRepository as any).findSummaryByRequestId.mockResolvedValue({
      id: 'sum-1',
      tenantId: 'tenant-1',
      requestId: 'req-12345',
      scope: 'BUILD',
      focus: 'failures',
      text: 'summary',
      highlights: ['h1'],
      qualitySignals: { heuristic: true },
      createdAt: new Date(),
    });

    const summary = await doclingResolvers.Query.doclingSummary(
      {},
      { requestId: 'req-12345' },
      ctx,
    );
    expect(summary).toEqual({
      id: 'sum-1',
      text: 'summary',
      focus: 'failures',
      highlights: ['h1'],
      qualitySignals: { heuristic: true },
    });
  });
});
