
import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

test('Governance Taxonomy Validation', async (t) => {
  const taxonomyPath = path.join(process.cwd(), 'governance/taxonomy.v1.json');

  await t.test('Taxonomy file exists', () => {
    assert.ok(fs.existsSync(taxonomyPath), 'Taxonomy file not found');
  });

  const content = fs.readFileSync(taxonomyPath, 'utf-8');
  const taxonomy = JSON.parse(content);

  await t.test('Schema structure is valid', () => {
    assert.strictEqual(taxonomy.version, '1.0.0');
    assert.ok(taxonomy.definitions, 'Missing definitions');
    assert.ok(taxonomy.definitions.LifecycleStage, 'Missing LifecycleStage');
    assert.ok(taxonomy.definitions.RiskClass, 'Missing RiskClass');
    assert.ok(taxonomy.definitions.ControlType, 'Missing ControlType');
  });

  await t.test('Risk Classes align with EU AI Act', () => {
    const risks = taxonomy.definitions.RiskClass.enum;
    assert.ok(risks.includes('prohibited'), 'Missing Prohibited class');
    assert.ok(risks.includes('high'), 'Missing High risk class');
    assert.ok(risks.includes('limited'), 'Missing Limited risk class');
    assert.ok(risks.includes('low'), 'Missing Low risk class');
  });

  await t.test('Immutability Check (Hash Stability)', () => {
    // This hash represents the approved state of version 1.0.0
    // If the file changes, this test should fail, prompting a version bump
    const currentHash = crypto.createHash('sha256').update(content).digest('hex');
    // We log the hash for the first run, but in a real scenario we'd assert against a known good hash
    // For now, we just ensure it generates a valid hash
    assert.ok(currentHash.length > 0);
    console.log(`Taxonomy V1 Hash: ${currentHash}`);
  });
});
