import crypto from 'node:crypto';
import http from 'node:http';
import { createEdgeIngestionApp } from '../applications/edgeIngestionApp.js';
import type { EdgeIngestionOptions } from '../applications/edgeIngestionApp.js';
import type { NanoEvent } from '../runtime/types.js';

export interface HttpBridgeOptions {
  readonly port?: number;
  readonly transform?: (event: NanoEvent) => NanoEvent;
  readonly onPersist?: (payload: Record<string, unknown>) => Promise<void> | void;
}

export function startHttpBridge(options: HttpBridgeOptions = {}): http.Server {
  const ingestionOptions = {
    ...(options.transform ? { transform: options.transform } : {}),
    ...(options.onPersist ? { onPersist: options.onPersist } : {})
  } satisfies EdgeIngestionOptions;
  const { runtime, ingest } = createEdgeIngestionApp(ingestionOptions);
  void runtime.start();
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      const failures = runtime.flushDiagnostics().filter((entry) => entry.status === 'failed');
      res.writeHead(failures.length === 0 ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: failures.length === 0 ? 'ok' : 'degraded', failedEvents: failures.length }));
      return;
    }
    if (req.method !== 'POST') {
      res.writeHead(405);
      res.end('method not allowed');
      return;
    }
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const payload = JSON.parse(Buffer.concat(chunks).toString());
        const event: NanoEvent = {
          type: 'sensor.ingested',
          payload,
          timestamp: new Date(),
          metadata: {
            correlationId: payload.correlationId ?? crypto.randomUUID(),
            source: 'http'
          }
        };
        await ingest(event);
        res.writeHead(202);
        res.end('accepted');
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: (error as Error).message }));
      }
    });
  });
  server.listen(options.port ?? 3001);
  return server;
}
