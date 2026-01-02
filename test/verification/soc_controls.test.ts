import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

test('SOC 2 Control Verification', async (t) => {

  await t.test('GOV-01: Board of Directors Oversight', () => {
    // Control: Governance Committee (AGENTS.md)
    const agentsPath = path.join(projectRoot, 'AGENTS.md');
    assert.ok(fs.existsSync(agentsPath), 'AGENTS.md must exist for GOV-01');
  });

  await t.test('CC6.1: Logical Access Security', () => {
    // Control: OPA Policies + OIDC
    const policyDir = path.join(projectRoot, 'policy');
    assert.ok(fs.existsSync(policyDir), 'policy/ directory must exist for CC6.1');

    // Check for at least one .rego file in policy/ or subdirectories
    // Simple check: check if policy directory is not empty
    const files = fs.readdirSync(policyDir, { recursive: true });
    const hasRego = files.some(f => typeof f === 'string' && f.endsWith('.rego'));
    // Note: recursive readdir returns strings in Node 20+

    // If recursive is not supported/reliable in all envs or returns buffers, handle gracefully.
    // Assuming Node 20 as per CI workflow.

    assert.ok(hasRego, 'Must contain .rego files for OPA policies');
  });

  await t.test('CC8.1: Change Management', () => {
    // Control: PR Normalization + CI Gates
    const prChecklistPath = path.join(projectRoot, 'PR_NORMALIZATION_CHECKLIST.md');
    assert.ok(fs.existsSync(prChecklistPath), 'PR_NORMALIZATION_CHECKLIST.md must exist for CC8.1');

    const workflowsDir = path.join(projectRoot, '.github/workflows');
    assert.ok(fs.existsSync(workflowsDir), '.github/workflows must exist for CI Gates');
  });

  await t.test('Evidence: SOC Mapping Document', () => {
    const socMappingPath = path.join(projectRoot, 'docs/compliance/SOC_MAPPING.md');
    assert.ok(fs.existsSync(socMappingPath), 'docs/compliance/SOC_MAPPING.md must exist');
  });

});
