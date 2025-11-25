import express from 'express';
import request from 'supertest';
import { getNlGraphQueryService } from '../index.js';

let nlGraphQueryRouter: express.Router;

jest.mock('../index.js', () => ({
  getNlGraphQueryService: jest.fn(),
}));

describe('nl-graph-query routes', () => {
  const app = express();
  app.use(express.json());
  beforeAll(async () => {
    nlGraphQueryRouter = (await import('@/routes/nl-graph-query')).default;
    app.use('/', nlGraphQueryRouter);
  });

  const compile = jest.fn();

  beforeEach(() => {
    compile.mockReset();
    (getNlGraphQueryService as jest.Mock).mockReturnValue({ compile });
  });

  it('returns explanation payload and metadata on successful compile', async () => {
    compile.mockResolvedValue({
      cypher: 'MATCH (p:Person)-[:ASSOCIATED_WITH]->(o:Organization) RETURN p, o LIMIT 5',
      explanationDetails: {
        summary: 'Finds patterns matching multiple graph structures',
        rationale: ['r1'],
        evidence: [{ source: 'MATCH clause', snippet: 'MATCH (p)', reason: 'core pattern' }],
        confidence: 0.88,
      },
      estimatedCost: {
        nodesScanned: 1,
        edgesScanned: 1,
        costClass: 'low',
        estimatedTimeMs: 1,
        estimatedMemoryMb: 1,
        costDrivers: [],
      },
      explanation: 'Explained',
      queryId: 'abc',
      warnings: [],
      requiredParameters: [],
      isSafe: true,
      timestamp: new Date(),
    });

    const response = await request(app).post('/compile').send({
      prompt: 'find people',
      schemaContext: { tenantId: 't1', userId: 'u1' },
      verbose: true,
    });

    expect(response.status).toBe(200);
    expect(response.body.explanationDetails.confidence).toBe(0.88);
    expect(response.body.metadata.explanation).toEqual({ confidence: 0.88, evidenceCount: 1 });
    expect(response.body.metadata.service).toBe('nl-graph-query-copilot');
    expect(compile).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'find people', verbose: true }),
    );
  });

  it('bubbles compile errors without explanation metadata', async () => {
    compile.mockResolvedValue({
      code: 'INVALID_INPUT',
      message: 'invalid',
      suggestions: [],
      originalPrompt: 'bad',
    });

    const response = await request(app).post('/compile').send({
      prompt: 'bad',
      schemaContext: { tenantId: 't1', userId: 'u1' },
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_INPUT');
    expect(response.body.metadata).toBeUndefined();
  });
});
