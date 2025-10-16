import express from 'express';
import request from 'supertest';
import { DoclingHandler } from '../src/handlers/docling-handler';
import { DoclingResponse } from '../src/types';

const buildApp = (handler: DoclingHandler) => {
  const app = express();
  app.use(express.json());
  app.post('/v1/parse', handler.parse);
  app.post('/v1/summarize', handler.summarize);
  app.post('/v1/extract', handler.extract);
  app.get('/metrics', handler.metrics);
  return app;
};

describe('docling handler', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('returns fragments for parse requests', async () => {
    const mockResponse: DoclingResponse<{ fragments: any[] }> = {
      requestId: 'req-12345678',
      tenantId: 'tenant-a',
      purpose: 'investigation',
      retention: 'short',
      provenance: {
        requestId: 'req-12345678',
        modelId: 'granite-docling-258m',
        modelCheckpoint: 'test',
        promptHash: 'hash',
        parameters: {},
        policyTags: [],
        timestamp: new Date().toISOString(),
      },
      usage: { characters: 42, costUsd: 0.01, latencyMs: 10 },
      result: {
        fragments: [
          {
            id: 'f-1',
            text: 'hello world',
            mimeType: 'text/plain',
            sha256: 'abc',
            sizeBytes: 5,
            metadata: {},
          },
        ],
      },
      policySignals: [],
    };
    const client = {
      parse: jest.fn().mockResolvedValue(mockResponse),
      summarize: jest.fn(),
      extract: jest.fn(),
    } as any;

    const app = buildApp(new DoclingHandler(client));
    const res = await request(app)
      .post('/v1/parse')
      .send({
        requestId: 'req-12345678',
        tenantId: 'tenant-a',
        purpose: 'investigation',
        retention: 'short',
        contentType: 'text/plain',
        bytes: Buffer.from('log content').toString('base64'),
      });

    expect(res.status).toBe(200);
    expect(res.body.result.fragments).toHaveLength(1);
    expect(client.parse).toHaveBeenCalledTimes(1);
  });

  it('caches responses by requestId', async () => {
    const mockResponse = {
      requestId: 'req-99999999',
      tenantId: 'tenant-b',
      purpose: 'investigation',
      retention: 'short',
      provenance: {
        requestId: 'req-99999999',
        modelId: 'granite',
        modelCheckpoint: 'test',
        promptHash: 'hash',
        parameters: {},
        policyTags: [],
        timestamp: new Date().toISOString(),
      },
      usage: { characters: 10, costUsd: 0.01, latencyMs: 5 },
      result: { fragments: [] },
      policySignals: [],
    } satisfies DoclingResponse<{ fragments: any[] }>;

    const client = {
      parse: jest.fn().mockResolvedValue(mockResponse),
      summarize: jest.fn(),
      extract: jest.fn(),
    } as any;
    const handler = new DoclingHandler(client);
    const app = buildApp(handler);

    const payload = {
      requestId: 'req-99999999',
      tenantId: 'tenant-b',
      purpose: 'investigation',
      retention: 'short',
      contentType: 'text/plain',
      bytes: Buffer.from('hello world').toString('base64'),
    };

    const first = await request(app).post('/v1/parse').send(payload);
    const second = await request(app).post('/v1/parse').send(payload);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(client.parse).toHaveBeenCalledTimes(1);
  });

  it('falls back when upstream fails', async () => {
    const fallbackResponse: DoclingResponse<{ fragments: any[] }> = {
      requestId: 'req-00000001',
      tenantId: 'tenant-c',
      purpose: 'investigation',
      retention: 'short',
      provenance: {
        requestId: 'req-00000001',
        modelId: 'granite',
        modelCheckpoint: 'test',
        promptHash: 'hash',
        parameters: {},
        policyTags: [],
        timestamp: new Date().toISOString(),
      },
      usage: { characters: 12, costUsd: 0.01, latencyMs: 5 },
      result: { fragments: [] },
      policySignals: [],
    };
    const client = {
      parse: jest
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce(fallbackResponse),
      summarize: jest.fn(),
      extract: jest.fn(),
    } as any;

    const app = buildApp(new DoclingHandler(client));
    const res = await request(app)
      .post('/v1/parse')
      .send({
        requestId: 'req-00000001',
        tenantId: 'tenant-c',
        purpose: 'investigation',
        retention: 'short',
        contentType: 'text/plain',
        bytes: Buffer.from('log content').toString('base64'),
      });

    expect(res.status).toBe(502);
    expect(res.body.fallback.result.fragments).toEqual([]);
    expect(client.parse).toHaveBeenCalledTimes(2);
  });
});
