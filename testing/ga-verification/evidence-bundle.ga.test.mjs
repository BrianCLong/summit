import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyEvidenceBundle } from '../../scripts/ga/verify-evidence-bundle.mjs';

const sbomPayload = {
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  metadata: {
    component: {
      name: 'intelgraph',
    },
  },
};

const provenancePayload = {
  _type: 'https://in-toto.io/Statement/v0.1',
  predicateType: 'https://slsa.dev/provenance/v0.2',
  subject: [{ name: 'intelgraph', digest: { sha256: 'deadbeef' } }],
};

async function createBundle({
  sbomContent,
  provenanceContent,
  checksumsOverride,
} = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ga-evidence-'));
  const sbomPath = sbomContent !== undefined ? path.join(dir, 'sbom.json') : null;
  const provenancePath =
    provenanceContent !== undefined ? path.join(dir, 'provenance.json') : null;

  if (sbomPath) {
    await writeFile(sbomPath, sbomContent);
  }

  if (provenancePath) {
    await writeFile(provenancePath, provenanceContent);
  }

  const checksumsPath = path.join(dir, 'checksums.txt');
  const checksums = checksumsOverride
    ? checksumsOverride
    : buildChecksums({ sbomPath, provenancePath });
  await writeFile(checksumsPath, checksums.join('\n'));

  return { dir, checksumsPath };
}

function buildChecksums({ sbomPath, provenancePath }) {
  const entries = [];
  if (sbomPath) {
    entries.push(`${sha256Of(sbomPath)}  sbom.json`);
  }
  if (provenancePath) {
    entries.push(`${sha256Of(provenancePath)}  provenance.json`);
  }
  return entries;
}

function sha256Of(filePath) {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

test('fails when SBOM is missing', async () => {
  const { dir } = await createBundle({
    provenanceContent: JSON.stringify(provenancePayload),
  });

  const result = verifyEvidenceBundle({ dir, checksumsFile: 'checksums.txt' });
  assert.equal(result.success, false);
  assert.ok(result.errors.some((error) => error.includes('sbom.json')));
});

test('fails when checksums mismatch', async () => {
  const { dir } = await createBundle({
    sbomContent: JSON.stringify(sbomPayload),
    provenanceContent: JSON.stringify(provenancePayload),
    checksumsOverride: ['0'.repeat(64) + '  sbom.json', '0'.repeat(64) + '  provenance.json'],
  });

  const result = verifyEvidenceBundle({ dir, checksumsFile: 'checksums.txt' });
  assert.equal(result.success, false);
  assert.ok(result.errors.some((error) => error.includes('Checksum mismatch')));
});

test('fails when SBOM is malformed', async () => {
  const { dir } = await createBundle({
    sbomContent: '{bad-json',
    provenanceContent: JSON.stringify(provenancePayload),
  });

  const result = verifyEvidenceBundle({ dir, checksumsFile: 'checksums.txt' });
  assert.equal(result.success, false);
  assert.ok(result.errors.some((error) => error.includes('Invalid JSON in sbom.json')));
});

test('passes for valid evidence bundle', async () => {
  const { dir } = await createBundle({
    sbomContent: JSON.stringify(sbomPayload),
    provenanceContent: JSON.stringify(provenancePayload),
  });

  const result = verifyEvidenceBundle({ dir, checksumsFile: 'checksums.txt' });
  assert.equal(result.success, true);
});
