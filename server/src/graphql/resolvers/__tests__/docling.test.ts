import { doclingResolvers } from '../docling';
import { doclingService } from '../../../services/DoclingService';
import { doclingRepository } from '../../../db/repositories/doclingRepository';

jest.mock('../../../services/DoclingService');
jest.mock('../../../db/repositories/doclingRepository');

describe('docling resolvers', () => {
  const ctx = { user: { tenantId: 'tenant-1' } };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('calls service for summarizeBuildFailure', async () => {
    (doclingService.summarizeBuildFailure as jest.Mock).mockResolvedValue({
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
    (doclingRepository.findSummaryByRequestId as jest.Mock).mockResolvedValue({
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
