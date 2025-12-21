import express from 'express';
import request from 'supertest';
import { buildNlToCypherPreviewRouter } from '../src/routes/nl-to-cypher-preview.js';
import { NlToCypherPreviewService } from '../src/ai/nl-to-cypher/nl-to-cypher-preview.service.js';
import { provenanceLedger } from '../src/provenance/ledger.js';

const app = express();
app.use(express.json());

const service = new NlToCypherPreviewService({
  async generate(prompt: string): Promise<string> {
    return `MATCH (n {description: '${prompt}'}) RETURN n LIMIT 25`;
  },
});
app.use('/api', buildNlToCypherPreviewRouter(service));

describe('NL to Cypher preview route', () => {
  beforeAll(() => {
    jest.spyOn(provenanceLedger, 'appendEntry').mockResolvedValue({
      id: 'test',
      tenantId: 't',
      sequenceNumber: BigInt(1),
      previousHash: '0x0',
      currentHash: '0x1',
      timestamp: new Date(),
      actionType: 'preview.generated',
      resourceType: 'nl-to-cypher-preview',
      resourceId: 'trace',
      actorId: 'user',
      actorType: 'user',
      payload: {},
      metadata: {},
    } as any);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('returns preview candidates and telemetry', async () => {
    const payload = {
      queryText: 'show all nodes',
      actorId: 'user-123',
      tenantId: 'tenant-abc',
      context: { timeframe: 'P7D', focusNodes: ['1', '2'] },
    };

    const response = await request(app)
      .post('/api/preview/v1/nl-to-cypher')
      .send(payload)
      .expect(200);

    expect(response.body.telemetry.cache).toBe('MISS');
    expect(response.body.candidates).toHaveLength(3);
    expect(response.body.candidates[0]).toHaveProperty('cypher');
    expect(response.body.candidates[0]).toHaveProperty('verification.hash');

    const cached = await request(app)
      .post('/api/preview/v1/nl-to-cypher')
      .send(payload)
      .expect(200);

    expect(cached.body.telemetry.cache).toBe('HIT');
  });

  it('blocks unsafe verbs via guardrails', async () => {
    const response = await request(app)
      .post('/api/preview/v1/nl-to-cypher')
      .send({ queryText: 'delete all nodes', actorId: 'user-123', tenantId: 'tenant-abc' })
      .expect(429);

    expect(response.body.error).toContain('guardrail');
  });
});
