import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fetchAndVerify } from '../../clients/cos-policy-fetcher/src/index';
import { spawnSync } from 'node:child_process';

const PACK_TAR = path.resolve(
  process.cwd(),
  'dist/policy-pack/v0/policy-pack-v0.tar',
);
const BUNDLE_JSON = path.resolve(
  process.cwd(),
  'contracts/policy-pack/v0/signing/cosign.bundle.json',
);
const MANIFEST = path.resolve(
  process.cwd(),
  'contracts/policy-pack/v0/manifest.json',
);

function startStubServer(): Promise<{ url: string; close: () => void }> {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      if (req.url?.includes('/v1/policy/packs/policy-pack-v0')) {
        const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
        res.setHeader('Content-Type', 'application/vnd.intelgraph.policy+tar');
        const digestValue =
          manifest?.manifest?.digest?.value || manifest?.digest?.value;
        res.setHeader('Digest', `sha-256=${digestValue}`);
        res.setHeader('X-Cosign-Bundle', fs.readFileSync(BUNDLE_JSON, 'utf8'));
        fs.createReadStream(PACK_TAR).pipe(res);
      } else {
        res.statusCode = 404;
        res.end();
      }
    });
    srv.listen(0, () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}/v1/policy/packs/policy-pack-v0`,
        close: () => srv.close(),
      });
    });
  });
}

// Utility: opa eval via CLI to confirm policy semantics did not drift
function opaEval(query: string, input: object, policyDir: string) {
  const r = spawnSync(
    'opa',
    [
      'eval',
      query,
      '--format',
      'values',
      '--data',
      path.join(policyDir, 'opa'),
      '--input',
      '-',
    ],
    {
      input: JSON.stringify(input),
      encoding: 'utf8',
    },
  );
  if (r.status !== 0) throw new Error(r.stderr.toString());
  return r.stdout.toString().trim();
}

describe('Policy Pack contract', () => {
  it('verifies signature and enforces ABAC allow for same-tenant', async () => {
    // Precondition: artifacts exist (built + signed)
    expect(fs.existsSync(PACK_TAR)).toBe(true);
    expect(fs.existsSync(BUNDLE_JSON)).toBe(true);

    const { url, close } = await startStubServer();
    try {
      const unpacked = await fetchAndVerify({ url });
      const decision = opaEval(
        'data.cos.abac.allow',
        {
          subject: { tenant: 't1', purpose: 'investigation' },
          resource: { tenant: 't1', retention_until: '2099-01-01T00:00:00Z' },
        },
        unpacked,
      );
      expect(decision).toEqual('true');
    } finally {
      close();
    }
  });

  it('denies cross-tenant access', async () => {
    const { url, close } = await startStubServer();
    try {
      const unpacked = await fetchAndVerify({ url });
      const decision = opaEval(
        'data.cos.abac.allow',
        {
          subject: { tenant: 'tA', purpose: 'investigation' },
          resource: { tenant: 'tB', retention_until: '2099-01-01T00:00:00Z' },
        },
        unpacked,
      );
      expect(decision).toEqual('false');
    } finally {
      close();
    }
  });
});
