import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { AddressInfo } from 'net';
import { tmpdir } from 'os';
import { resolveSeraProxyConfig } from '../src/sera-proxy/config.js';
import { startSeraProxy } from '../src/sera-proxy/proxy.js';

describe('SERA proxy', () => {
  it('forwards requests with Authorization header and model override', async () => {
    let capturedAuth: string | undefined;
    let capturedBody: Record<string, unknown> | undefined;

    const upstream = http.createServer((req, res) => {
      capturedAuth = req.headers.authorization as string | undefined;
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      req.on('end', () => {
        const bodyText = Buffer.concat(chunks).toString('utf8');
        capturedBody = JSON.parse(bodyText) as Record<string, unknown>;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ id: 'ok', choices: [] }));
      });
    });

    await new Promise<void>((resolve) => upstream.listen(0, resolve));
    const upstreamPort = (upstream.address() as AddressInfo).port;

    const artifactDir = path.join(tmpdir(), `sera-proxy-${Math.random().toString(16).slice(2)}`);

    const config = resolveSeraProxyConfig({
      endpoint: `http://127.0.0.1:${upstreamPort}/v1/chat/completions`,
      apiKey: 'dummy',
      model: 'allenai/SERA-8B',
      port: 0,
      allowHosts: ['127.0.0.1'],
      artifactDir,
    });

    const proxy = await startSeraProxy(config);
    const proxyPort = (proxy.address() as AddressInfo).port;

    const response = await fetch(`http://127.0.0.1:${proxyPort}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'other', messages: [] }),
    });

    expect(response.status).toBe(200);
    await response.json();

    expect(capturedAuth).toBe('Bearer dummy');
    expect(capturedBody?.model).toBe('allenai/SERA-8B');

    const stamp = JSON.parse(
      fs.readFileSync(path.join(artifactDir, 'stamp.json'), 'utf8')
    ) as Record<string, string>;
    expect(Object.keys(stamp).sort()).toEqual(['metricsSha256', 'reportSha256']);

    proxy.close();
    upstream.close();
  });

  it('prefers CLI overrides over environment variables', () => {
    const config = resolveSeraProxyConfig(
      {
        endpoint: 'http://localhost:8000/v1/chat/completions',
        apiKey: 'override',
        allowHosts: ['localhost'],
      },
      {
        SERA_ENDPOINT: 'http://localhost:9000/v1/chat/completions',
        SERA_API_KEY: 'env',
      }
    );

    expect(config.endpoint).toBe('http://localhost:8000/v1/chat/completions');
    expect(config.apiKey).toBe('override');
  });
});
