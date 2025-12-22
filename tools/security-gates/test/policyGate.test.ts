import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { enforcePolicyGate } from '../src/policyGate.ts';
import type { PolicyGateConfig } from '../src/types.ts';

test('flags wildcard IAM statements and public endpoints', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-gate-'));
  const inputPath = path.join(tmpDir, 'input.json');
  fs.writeFileSync(
    inputPath,
    JSON.stringify({
      iamRoles: [
        {
          name: 'bad-role',
          statements: [{ action: '*', resource: '*', effect: 'allow' }]
        }
      ],
      exposures: { publicEndpoints: ['https://public.example.com'] }
    })
  );

  const config: PolicyGateConfig = {
    inputPath,
    denyWildcardIam: true,
    allowPublicEndpoints: false
  };

  const result = await enforcePolicyGate('/', config);
  assert.strictEqual(result.ok, false);
  assert.ok(result.details.join(' ').includes('wildcard'));
  assert.ok(result.details.join(' ').includes('Public endpoints'));
});

test('passes with clean input', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-gate-'));
  const inputPath = path.join(tmpDir, 'input.json');
  fs.writeFileSync(
    inputPath,
    JSON.stringify({
      iamRoles: [
        {
          name: 'good-role',
          statements: [{ action: 's3:GetObject', resource: 'arn:aws:s3:::bucket/*', effect: 'allow' }]
        }
      ],
      exposures: { publicEndpoints: [] }
    })
  );

  const config: PolicyGateConfig = {
    inputPath,
    denyWildcardIam: true,
    allowPublicEndpoints: false
  };

  const result = await enforcePolicyGate('/', config);
  assert.strictEqual(result.ok, true);
});
