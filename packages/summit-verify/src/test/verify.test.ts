import test from 'node:test';
import assert from 'node:assert';
import { verifyAttestation } from '../verify.js';
import { writeFileSync, rmSync } from 'node:fs';

test('verifyAttestation validates correct attestation', (t) => {
  const runId = 'test-run-id';
  const manifestDigest = 'abc';
  const predicate = {
    buildDefinition: {
      externalParameters: {
        openlineage: {
          runId: runId
        }
      },
      internalParameters: {
        runManifestDigest: manifestDigest
      }
    }
  };
  const attestation = {
    payload: Buffer.from(JSON.stringify({ predicate })).toString('base64')
  };

  const tmpPath = './tmp-attestation.json';
  writeFileSync(tmpPath, JSON.stringify(attestation));

  try {
    const result = verifyAttestation(runId, tmpPath, manifestDigest);
    assert.strictEqual(result.status, 'PASS');
    assert.strictEqual(result.checks.length, 2);
  } finally {
    rmSync(tmpPath);
  }
});
