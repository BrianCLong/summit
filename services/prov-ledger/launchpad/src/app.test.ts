import { buildProvLedgerApp, InMemoryLedger } from './app';

describe('prov-ledger launchpad', () => {
  it('creates evidence and exports manifest over REST', async () => {
    process.env.FLAG_PROV_LEDGER = '1';
    const ledger = new InMemoryLedger();
    const { app } = await buildProvLedgerApp({ ledger });
    const server = app.listen(0);
    const base = `http://localhost:${(server.address() as any).port}`;
    const evidenceRes = await fetch(`${base}/ledger/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha256: 'a'.repeat(64), contentType: 'application/pdf' }),
    });
    expect(evidenceRes.status).toBe(201);
    const evidence = (await evidenceRes.json()) as { id: string };

    const manifestRes = await fetch(`${base}/ledger/export/${evidence.id}`);
    expect(manifestRes.status).toBe(200);
    const manifest = (await manifestRes.json()) as { manifest: string };
    const decoded = JSON.parse(Buffer.from(manifest.manifest, 'base64').toString('utf8'));
    expect(decoded.evidence).toHaveLength(1);
    expect(decoded.evidence[0].sha256).toBe('a'.repeat(64));
    server.close();
  });

  it('rejects invalid evidence creation', async () => {
    process.env.FLAG_PROV_LEDGER = '1';
    const ledger = new InMemoryLedger();
    const { app } = await buildProvLedgerApp({ ledger });
    const server = app.listen(0);
    const base = `http://localhost:${(server.address() as any).port}`;

    const evidenceRes = await fetch(`${base}/ledger/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha256: 'b'.repeat(63), contentType: 'text/plain' }),
    });
    expect(evidenceRes.status).toBe(400);
    const body = (await evidenceRes.json()) as { error: string };
    expect(body.error).toContain('64 character');
    server.close();
  });
});
