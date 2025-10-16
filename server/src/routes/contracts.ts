import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { spawnSync } from 'child_process';

const router = Router();

// GET /v1/policy/packs/:packId
function ensurePackBuiltDevOnly() {
  const devAutoBuild =
    process.env.MC_DEV_AUTO_BUILD_PACK === 'true' &&
    process.env.NODE_ENV !== 'production';
  if (!devAutoBuild) return;
  const build = spawnSync('bash', ['scripts/build_policy_pack.sh'], {
    encoding: 'utf8',
  });
  if (build.status !== 0) {
    console.error('[pack:auto-build] failed:', build.stderr);
    return;
  }
  // Attempt sign if bundle missing (best-effort)
  const bundleJson = path.resolve(
    process.cwd(),
    'contracts/policy-pack/v0/signing/cosign.bundle.json',
  );
  if (!fs.existsSync(bundleJson)) {
    const sign = spawnSync('bash', ['scripts/cosign_sign.sh'], {
      encoding: 'utf8',
    });
    if (sign.status !== 0) console.warn('[pack:auto-sign] warn:', sign.stderr);
  }
}

router.get('/policy/packs/:packId', async (req, res) => {
  const { packId } = req.params; // expect 'policy-pack-v0'
  if (packId !== 'policy-pack-v0')
    return res.status(404).json({ error: 'unknown pack' });

  const packTar = path.resolve(
    process.cwd(),
    'dist/policy-pack/v0/policy-pack-v0.tar',
  );
  const bundleJson = path.resolve(
    process.cwd(),
    'contracts/policy-pack/v0/signing/cosign.bundle.json',
  );
  const manifestPath = path.resolve(
    process.cwd(),
    'contracts/policy-pack/v0/manifest.json',
  );
  if (!fs.existsSync(packTar)) {
    ensurePackBuiltDevOnly();
  }
  if (!fs.existsSync(packTar))
    return res.status(503).json({ error: 'pack not built yet' });
  if (!fs.existsSync(manifestPath))
    return res.status(404).json({ error: 'manifest missing' });

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const digestValue =
    manifest?.manifest?.digest?.value || manifest?.digest?.value || 'TBD';

  // Caching headers
  res.setHeader('ETag', `W/"sha-256:${digestValue}"`);
  res.setHeader('Cache-Control', 'public, max-age=60, immutable');
  res.setHeader('Content-Type', 'application/vnd.intelgraph.policy+tar');
  res.setHeader('Digest', `sha-256=${digestValue}`);
  if (process.env.MC_INLINE_BUNDLE === 'true' && fs.existsSync(bundleJson)) {
    res.setHeader('X-Cosign-Bundle', fs.readFileSync(bundleJson, 'utf8'));
  }
  const stat = fs.statSync(packTar);
  res.setHeader('Content-Length', String(stat.size));
  fs.createReadStream(packTar).pipe(res);
});

router.head('/policy/packs/:packId', (req, res) => {
  const { packId } = req.params;
  if (packId !== 'policy-pack-v0') return res.status(404).end();
  const manifestPath = path.resolve(
    process.cwd(),
    'contracts/policy-pack/v0/manifest.json',
  );
  if (!fs.existsSync(manifestPath)) return res.status(503).end();
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const digestValue =
    manifest?.manifest?.digest?.value || manifest?.digest?.value || 'TBD';
  res.setHeader('ETag', `W/"sha-256:${digestValue}"`);
  res.setHeader('Digest', `sha-256=${digestValue}`);
  res.setHeader('Content-Type', 'application/vnd.intelgraph.policy+tar');
  res.status(200).end();
});

router.get('/policy/packs/:packId/attestation', (req, res) => {
  const { packId } = req.params;
  if (packId !== 'policy-pack-v0')
    return res.status(404).json({ error: 'unknown pack' });
  const bundleJson = path.resolve(
    process.cwd(),
    'contracts/policy-pack/v0/signing/cosign.bundle.json',
  );
  const manifestPath = path.resolve(
    process.cwd(),
    'contracts/policy-pack/v0/manifest.json',
  );
  if (!fs.existsSync(bundleJson) || !fs.existsSync(manifestPath))
    return res.status(503).json({ error: 'attestation not available' });
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const digestValue =
    manifest?.manifest?.digest?.value || manifest?.digest?.value || 'TBD';
  res.setHeader('Content-Type', 'application/vnd.sigstore.bundle+json');
  res.setHeader('ETag', `W/"sha-256:${digestValue}"`);
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(fs.readFileSync(bundleJson, 'utf8'));
});

// POST /v1/evidence
router.post('/evidence', async (req, res) => {
  try {
    const body = req.body || {};
    // Forward to GraphQL mutation for canonical handling in starter
    // In production, persist and verify attestation headers here.
    return res.status(202).json({
      status: 'accepted',
      route: 'POST /v1/evidence',
      received: body,
      hint: 'Use GraphQL mutation publishEvidence for canonical write path',
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'internal error' });
  }
});

export default router;
