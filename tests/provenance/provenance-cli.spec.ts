import { generateKeyPairSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ExportManifest,
  LedgerFile,
  appendLedgerEntry,
  buildEvidenceChain,
  calculateManifestHash,
  signManifest,
  verifyLedger,
  verifyManifest,
} from '../../services/provenance-cli/src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const examplesDir = path.resolve(__dirname, '../../exports/examples');

function loadJson<T>(name: string): T {
  const filePath = path.join(examplesDir, name);
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

test('sample export verifies against the ledger snapshot', () => {
  const manifest = loadJson<ExportManifest>('manifest.json');
  const ledger = loadJson<LedgerFile>('ledger.json');
  const publicKey = readFileSync(path.join(examplesDir, 'export-public.pem'), 'utf8');

  const result = verifyManifest(manifest, ledger, { manifestPublicKey: publicKey });
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(result.ledger.valid, true, result.ledger.errors.join('\n'));
});

test('tampered manifest evidence is detected', () => {
  const manifest = loadJson<ExportManifest>('manifest-tampered.json');
  const ledger = loadJson<LedgerFile>('ledger.json');
  const publicKey = readFileSync(path.join(examplesDir, 'export-public.pem'), 'utf8');

  const result = verifyManifest(manifest, ledger, { manifestPublicKey: publicKey });
  assert.equal(result.valid, false);
  assert(result.errors.some((error) => error.includes('content hash mismatch')));
});

test('ledger signature tampering is caught', () => {
  const ledger = loadJson<LedgerFile>('ledger.json');
  ledger.entries[0].signature = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
  const verification = verifyLedger(ledger);
  assert.equal(verification.valid, false);
  assert(verification.errors.some((err) => err.includes('invalid signature')));
});

test('evidence chain is materialized for API use', () => {
  const manifest = loadJson<ExportManifest>('manifest.json');
  const ledger = loadJson<LedgerFile>('ledger.json');
  const chains = buildEvidenceChain('entity-123', manifest, ledger);
  assert.equal(chains.length, 1);
  assert.equal(chains[0].evidence.length, manifest.claims[0].evidence.length);
  assert(chains[0].evidence.every((node) => node.actor.length > 0));
});

test('append + sign workflow produces verifiable manifest', () => {
  const { privateKey: ledgerPriv, publicKey: ledgerPub } = generateKeyPairSync('ed25519');
  const ledgerPrivatePem = ledgerPriv.export({ type: 'pkcs8', format: 'pem' }).toString();
  const ledgerPublicPem = ledgerPub.export({ type: 'spki', format: 'pem' }).toString();

  const ledger: LedgerFile = {
    version: '1.0',
    ledgerId: 'unit-test-ledger',
    publicKeys: [
      { keyId: 'ledger-signer', algorithm: 'ed25519', publicKey: ledgerPublicPem },
    ],
    entries: [],
    rootHash: '',
  };

  const ingestHash = '2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90'; // sha256("ingest")
  appendLedgerEntry(
    ledger,
    {
      claimId: 'claim-test',
      entityId: 'entity-test',
      evidenceId: 'evidence-ingest',
      stage: 'ingest',
      contentHash: ingestHash,
      actor: 'ingest-service',
      signingKeyId: 'ledger-signer',
    },
    ledgerPrivatePem,
  );

  const transformHash = '3a7bd3e2360a3d80d6b0f42776f0a8d8f7c11d1f0aa3bd4dc735dc1f9a5d4f27'; // sha256("transform")
  appendLedgerEntry(
    ledger,
    {
      claimId: 'claim-test',
      entityId: 'entity-test',
      evidenceId: 'evidence-transform',
      stage: 'transform',
      contentHash: transformHash,
      actor: 'fusion-service',
      signingKeyId: 'ledger-signer',
      metadata: { modelVersion: 'v1.2.0' },
    },
    ledgerPrivatePem,
  );

  const ledgerVerification = verifyLedger(ledger);
  assert.equal(ledgerVerification.valid, true, ledgerVerification.errors.join('\n'));

  const manifest: ExportManifest = {
    version: '1.0',
    bundle: {
      id: 'bundle-test',
      generatedAt: new Date().toISOString(),
      sourceSystem: 'unit-test',
      environment: 'sandbox',
      exportType: 'unit',
      itemCount: 1,
    },
    claims: [
      {
        claimId: 'claim-test',
        entityId: 'entity-test',
        type: 'demo',
        disposition: 'suspected',
        summary: 'Synthetic unit test claim',
        createdAt: new Date().toISOString(),
        confidence: 'medium',
        evidence: ledger.entries.map((entry) => ({
          evidenceId: entry.evidenceId,
          stage: entry.stage,
          artifactHash: entry.contentHash,
          ledgerSequence: entry.sequence,
        })),
      },
    ],
    artifacts: [],
    ledger: {
      uri: './ledger.json',
      rootHash: ledgerVerification.rootHash,
      entries: ledger.entries.map((entry) => ({
        sequence: entry.sequence,
        hash: entry.hash,
      })),
    },
    integrity: {
      manifestHash: '',
    },
  };

  const { privateKey: manifestPriv, publicKey: manifestPub } = generateKeyPairSync('ed25519');
  const manifestPrivatePem = manifestPriv.export({ type: 'pkcs8', format: 'pem' }).toString();
  const manifestPublicPem = manifestPub.export({ type: 'spki', format: 'pem' }).toString();

  signManifest(manifest, manifestPrivatePem, 'manifest-signer');
  assert.notEqual(manifest.integrity.manifestHash.length, 0);
  assert.equal(
    manifest.integrity.manifestHash,
    calculateManifestHash(manifest),
  );

  const verification = verifyManifest(manifest, ledger, { manifestPublicKey: manifestPublicPem });
  assert.equal(verification.valid, true, verification.errors.join('\n'));
});
