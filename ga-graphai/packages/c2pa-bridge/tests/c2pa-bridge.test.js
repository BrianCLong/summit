const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { mkdtempSync, rmSync, writeFileSync, readFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { generateKeyPairSync } = require('node:crypto');

let tempDir;
let privateKey;
let publicKey;

before(() => {
  tempDir = mkdtempSync(path.join(tmpdir(), 'cpb-'));
  const { privateKey: priv, publicKey: pub } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  privateKey = priv.export({ type: 'pkcs1', format: 'pem' }).toString();
  publicKey = pub.export({ type: 'spki', format: 'pem' }).toString();
});

after(() => {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

function loadDist() {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  return require('../dist/index.js');
}

async function createBaseStamp() {
  const assetPath = path.join(tempDir, 'asset.txt');
  writeFileSync(assetPath, 'original asset data');
  const { stampAsset } = loadDist();
  const result = await stampAsset({
    assetPath,
    metadata: {
      toolChain: [
        {
          name: 'generator',
          version: '1.0.0',
          parameters: { prompt: 'demo' },
        },
      ],
      datasetLineageId: 'dataset-123',
      policyHash: 'policy-hash-abc',
      notes: 'base asset',
    },
    signer: {
      id: 'signer-a',
      algorithm: 'rsa-sha256',
      privateKey,
      publicKey,
    },
  });
  return { assetPath, manifestPath: result.manifestPath };
}

test('stamps and verifies an asset manifest', async () => {
  const { verifyProvenance } = loadDist();
  const { assetPath, manifestPath } = await createBaseStamp();
  const result = await verifyProvenance({
    manifestPath,
    assetPath,
    publicKey,
  });
  assert.ok(result.validSignature, 'signature should verify');
  assert.ok(result.validAssetHash, 'asset hash should verify');
  assert.strictEqual(result.issues.length, 0);
});

test('detects tampered asset contents', async () => {
  const { verifyProvenance } = loadDist();
  const { assetPath, manifestPath } = await createBaseStamp();
  writeFileSync(assetPath, 'tampered data');
  const result = await verifyProvenance({
    manifestPath,
    assetPath,
    publicKey,
  });
  assert.ok(!result.validAssetHash, 'asset hash mismatch expected');
  assert.ok(result.issues.some((i) => i.message.includes('Asset hash')));
});

test('detects tampered manifest claim', async () => {
  const { verifyProvenance } = loadDist();
  const { assetPath, manifestPath } = await createBaseStamp();
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.claim.datasetLineageId = 'malicious-change';
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  const result = await verifyProvenance({
    manifestPath,
    assetPath,
    publicKey,
  });
  assert.ok(!result.validSignature, 'signature should fail after tamper');
  assert.ok(result.issues.some((i) => i.message.includes('Signature verification failed')));
});

test('creates and verifies derivative manifest with chain of custody', async () => {
  const { createDerivativeStamp, verifyProvenance } = loadDist();
  const { assetPath: parentAsset, manifestPath: parentManifest } = await createBaseStamp();
  const derivativePath = path.join(tempDir, 'derivative.txt');
  writeFileSync(derivativePath, 'redacted derivative data');

  const { manifestPath: derivativeManifest } = await createDerivativeStamp({
    assetPath: derivativePath,
    parentManifestPath: parentManifest,
    parentPublicKey: publicKey,
    parentAssetPath: parentAsset,
    metadata: {
      toolChain: [
        {
          name: 'redactor',
          version: '0.2.0',
          parameters: { fields: 'faces' },
        },
      ],
      datasetLineageId: 'derivative-dataset',
      policyHash: 'policy-derivative',
      notes: 'redaction applied',
    },
    redactions: ['faces blurred'],
    signer: {
      id: 'signer-b',
      algorithm: 'rsa-sha256',
      privateKey,
      publicKey,
    },
  });

  const result = await verifyProvenance({
    manifestPath: derivativeManifest,
    assetPath: derivativePath,
    publicKey,
    parentManifestPath: parentManifest,
    parentPublicKey: publicKey,
    parentAssetPath: parentAsset,
  });

  assert.ok(result.validSignature, 'derivative signature should verify');
  assert.ok(result.validAssetHash, 'derivative asset hash should verify');
  assert.strictEqual(result.issues.length, 0);
  assert.ok(result.parent, 'parent verification result expected');
  assert.strictEqual(result.parent.manifestHash, result.manifest.parent.manifestHash);
});
