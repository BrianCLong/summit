import * as http from 'http';
import { SeraProxyEvidenceStore } from './evidence.js';
import { SeraProxyConfig } from './config.js';

const POLICY_DECISION_ID = 'sera-proxy-allowlist:v1';

export async function startSeraProxy(config: SeraProxyConfig): Promise<http.Server> {
  const evidence = new SeraProxyEvidenceStore(config.artifactDir, config.endpointHost);

  const server = http.createServer(async (req, res) => {
    if (req.url === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (!req.url || req.url !== '/v1/chat/completions') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(405, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let bodyBuffer: Buffer;
    try {
      bodyBuffer = await readRequestBody(req, config.maxBodyBytes);
    } catch (error) {
      res.writeHead(413, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Payload too large' }));
      evidence.recordBlocked(config.maxBodyBytes + 1);
      return;
    }

    const bodyText = bodyBuffer.toString('utf8');
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(bodyText) as Record<string, unknown>;
    } catch (error) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      return;
    }

    if (config.model) {
      payload = { ...payload, model: config.model };
    }

    const forwardedBody = JSON.stringify(payload);

    try {
      const upstreamResponse = await fetch(config.endpoint, {
        method: 'POST',
        headers: buildUpstreamHeaders(config),
        body: forwardedBody,
      });

      const responseText = await upstreamResponse.text();
      res.statusCode = upstreamResponse.status;
      res.setHeader(
        'content-type',
        upstreamResponse.headers.get('content-type') ?? 'application/json'
      );
      res.setHeader('x-sera-proxy', 'summit');
      res.end(responseText);

      evidence.recordExchange(forwardedBody, responseText, POLICY_DECISION_ID);
    } catch (error) {
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Upstream request failed' }));
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(config.port, () => resolve());
  });

  return server;
}

function buildUpstreamHeaders(config: SeraProxyConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };

  if (config.apiKey) {
    headers.authorization = `Bearer ${config.apiKey}`;
  }

  return headers;
}

async function readRequestBody(req: http.IncomingMessage, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += bufferChunk.length;
    if (total > maxBytes) {
      throw new Error('payload too large');
    }
    chunks.push(bufferChunk);
  }

  return Buffer.concat(chunks);
}
