import crypto from 'crypto';
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  jest,
} from '@jest/globals';

const recordProvenanceEntry = jest.fn(async () => 'mock-id') as jest.Mock;
let n8nHandler: ((req: any, res: any) => Promise<any>) | undefined;
let recordSpy: any;
let ProvenanceLedgerServiceRef: any;

describe('n8n webhook', () => {
  beforeAll(async () => {
    try {
      process.env.N8N_SIGNING_SECRET = 'test-secret';
      jest.resetModules();
      const { default: n8nRouter } = await import('../src/routes/n8n.js');
      const { ProvenanceLedgerService } = await import(
        '../src/services/provenance-ledger.js'
      );
      ProvenanceLedgerServiceRef = ProvenanceLedgerService;
      const routeLayer = (n8nRouter as any).stack.find(
        (layer: any) => layer.route?.path === '/webhooks/n8n',
      );
      if (!routeLayer) {
        throw new Error('n8n route not registered');
      }
      const handlers = routeLayer.route.stack.map(
        (layer: any) => layer.handle,
      );
      n8nHandler = handlers[handlers.length - 1];
    } catch (error) {
      throw new Error(
        `n8n webhook test setup failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  });

  afterAll(() => {
    recordSpy?.mockRestore();
  });

  beforeEach(() => {
    recordProvenanceEntry.mockReset();
    recordSpy = jest
      .spyOn(ProvenanceLedgerServiceRef.prototype, 'recordProvenanceEntry')
      .mockImplementation(recordProvenanceEntry as any);
  });

  it('rejects bad signature', async () => {
    const body = JSON.stringify({ runId: 'r1' });
    const req: any = {
      method: 'POST',
      url: '/webhooks/n8n',
      headers: { 'x-maestro-signature': 'bad' },
      header: (name: string) => req.headers[name.toLowerCase()],
      body: Buffer.from(body),
      ip: '127.0.0.1',
    };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    await n8nHandler?.(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, error: 'bad signature' }),
    );
  });

  it('accepts good signature', async () => {
    const body = JSON.stringify({
      runId: 'run-123',
      artifact: 'n8n.json',
      content: { ok: true },
    });
    const sig = crypto
      .createHmac('sha256', 'test-secret')
      .update(body)
      .digest('hex');
    const req: any = {
      method: 'POST',
      url: '/webhooks/n8n',
      headers: { 'x-maestro-signature': sig },
      header: (name: string) => req.headers[name.toLowerCase()],
      body: Buffer.from(body),
      ip: '127.0.0.1',
    };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    await n8nHandler?.(req, res);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});
