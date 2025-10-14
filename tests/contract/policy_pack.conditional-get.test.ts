import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';

async function startServerFromSource(): Promise<{ url: string; close: () => void }> {
  const { createApp } = await import('../../server/src/app.ts');
  const app = await createApp();
  return new Promise((resolve) => {
    const srv = http.createServer(app as any);
    srv.listen(0, () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({ url: `http://127.0.0.1:${port}`, close: () => srv.close() });
    });
  });
}

describe('Policy pack route — conditional GET', () => {
  const manifestPath = path.resolve(process.cwd(), 'contracts/policy-pack/v0/manifest.json');
  const tarPath = path.resolve(process.cwd(), 'dist/policy-pack/v0/policy-pack-v0.tar');

  beforeAll(() => {
    expect(fs.existsSync(tarPath)).toBe(true);
    expect(fs.existsSync(manifestPath)).toBe(true);
  });

  it('responds 304 with matching If-None-Match', async () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const etag = `W/"sha-256:${manifest.manifest.digest.value}"`;
    const { url, close } = await startServerFromSource();
    try {
      const res = await fetch(`${url}/v1/policy/packs/policy-pack-v0`, { headers: { 'If-None-Match': etag } });
      expect(res.status).toBe(304);
      expect(res.headers.get('ETag')).toBe(etag);
      expect(res.headers.get('Last-Modified')).toBeTruthy();
    } finally { close(); }
  });

  it('responds 200 with body when ETag does not match', async () => {
    const { url, close } = await startServerFromSource();
    try {
      const res = await fetch(`${url}/v1/policy/packs/policy-pack-v0`, { headers: { 'If-None-Match': 'W/"sha-256:deadbeef"' } });
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('application/vnd.intelgraph.policy+tar');
      const buf = Buffer.from(await res.arrayBuffer());
      expect(buf.byteLength).toBeGreaterThan(0);
    } finally { close(); }
  });
});
