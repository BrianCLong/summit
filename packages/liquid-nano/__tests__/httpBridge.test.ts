import http from 'node:http';
import { startHttpBridge } from '../src/integration/httpBridge.js';

let server: http.Server;
const port = 4100;
const persisted: Record<string, unknown>[] = [];

beforeAll(() => {
  jest.useRealTimers();
  server = startHttpBridge({
    port,
    onPersist: async (payload) => {
      persisted.push(payload);
    }
  });
});

afterAll(() => {
  server.close();
});

describe('HTTP bridge integration', () => {
  it('accepts POST payloads and persists them', async () => {
    const payload = JSON.stringify({ reading: 21, unit: 'C' });
    await new Promise<void>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            if (res.statusCode === 202) {
              resolve();
            } else {
              reject(new Error(`unexpected status ${res.statusCode}`));
            }
          });
        }
      );
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toMatchObject({ reading: 21, unit: 'C' });
    const health = await fetch(`http://127.0.0.1:${port}/health`);
    expect(health.status).toBe(200);
  });

  it('returns method not allowed for unsupported verbs', async () => {
    const res = await fetch(`http://127.0.0.1:${port}`, { method: 'GET' });
    expect(res.status).toBe(405);
  });

  it('reports degraded health when diagnostics contain failures', async () => {
    const failurePort = port + 1;
    const failingServer = startHttpBridge({
      port: failurePort,
      onPersist: () => {
        throw new Error('persist failed');
      }
    });
    try {
      await fetch(`http://127.0.0.1:${failurePort}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reading: 1 })
      });
      const health = await fetch(`http://127.0.0.1:${failurePort}/health`);
      expect(health.status).toBe(503);
    } finally {
      failingServer.close();
    }
  });
});
