#!/usr/bin/env node

const { execFileSync } = require('child_process');
const { join } = require('path');

const opaBinary = process.env.OPA_BIN || 'opa';

const samples = [
  {
    name: 'step_up_obligation',
    file: join(__dirname, '..', 'policies', 'opa', 'sample-inputs', 'tenant-step-up.json'),
    assert: (result) => {
      if (result.allow) {
        throw new Error('Expected deny with MFA obligation');
      }
      const obligations = result.obligations || [];
      const hasMfa = obligations.some(
        (o) => o.type === 'mfa' && o.method === 'webauthn',
      );
      if (!hasMfa) {
        throw new Error('Missing WebAuthn obligation for step-up');
      }
    },
  },
  {
    name: 'cross_tenant_denied',
    file: join(__dirname, '..', 'policies', 'opa', 'sample-inputs', 'tenant-cross-tenant.json'),
    assert: (result) => {
      if (result.allow) {
        throw new Error('Cross-tenant access should be denied');
      }
      const reasons = Array.isArray(result.denied_reasons)
        ? result.denied_reasons
        : Object.keys(result.denied_reasons || {});
      if (!reasons.includes('tenant_scope_violation')) {
        throw new Error('Expected tenant_scope_violation reason');
      }
    },
  },
];

function evalPolicy(sample) {
  const policyPath = join(
    __dirname,
    '..',
    'policies',
    'opa',
    'tenant_abac.rego',
  );

  const output = execFileSync(
    opaBinary,
    [
      'eval',
      '--format=json',
      '--data',
      policyPath,
      '--input',
      sample.file,
      'data.summit.tenant_abac.decision',
    ],
    { encoding: 'utf8' },
  );

  const parsed = JSON.parse(output);
  const result = parsed.result?.[0]?.expressions?.[0]?.value;
  if (!result) {
    throw new Error(`No decision returned for ${sample.name}`);
  }
  sample.assert(result);
  console.log(`✅ ${sample.name}`);
}

for (const sample of samples) {
  try {
    evalPolicy(sample);
  } catch (error) {
    console.error(`❌ ${sample.name}:`, error.message);
    process.exitCode = 1;
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}
