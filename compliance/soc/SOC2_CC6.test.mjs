import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

describe('SOC2 CC6 - Change Management', () => {
  it('GA Release Pipeline must enforce environment approval', () => {
    const workflowPath = path.join(process.cwd(), '.github/workflows/release-ga.yml');
    const content = fs.readFileSync(workflowPath, 'utf-8');

    // Check for environment protection
    assert.ok(content.includes('environment:'), 'Must contain environment configuration');
    assert.ok(content.includes('name: ga-release'), 'Must use ga-release environment');

    // Check for two-person approval comment or logic
    assert.ok(content.includes('Two-person approval'), 'Must mention two-person approval');
  });

  it('GA Release Pipeline must verify lineage', () => {
     const workflowPath = path.join(process.cwd(), '.github/workflows/release-ga.yml');
     const content = fs.readFileSync(workflowPath, 'utf-8');
     assert.ok(content.includes('Lineage Check'), 'Must perform Lineage Check');
  });
});
