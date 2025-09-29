const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { SchemaRegistry, buildJsonSchema } = require('../src/schemaRegistry');

test('validates bundled customer profile schemas', () => {
  const registry = new SchemaRegistry();
  const results = registry.validateContract('customer-profile');
  assert.strictEqual(results.length, 2);
  results.forEach((result) => assert.strictEqual(result.valid, true));
});

test('detects breaking changes when required field is removed', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'data-spine-'));
  const registry = new SchemaRegistry({ contractsDir: tmpDir });
  const metadataPolicies = [
    { field: 'id', action: 'pass' },
    { field: 'email', action: 'tokenize' }
  ];
  registry.initContract('test-contract', {
    fieldPolicies: metadataPolicies,
    classification: ['PII']
  });
  const contractDir = path.join(tmpDir, 'test-contract');
  const latest = registry.listVersions('test-contract').pop();
  const schemaPath = path.join(contractDir, latest, 'schema.json');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  schema.properties.email = { type: 'string' };
  schema.required.push('email');
  fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
  const bumpedMetadata = { ...schema['x-data-spine'], version: '1.1.0' };
  const bumped = buildJsonSchema('test-contract', '1.1.0', bumpedMetadata, {
    id: { type: 'string' }
  });
  fs.mkdirSync(path.join(contractDir, '1.1.0'));
  fs.writeFileSync(path.join(contractDir, '1.1.0', 'schema.json'), JSON.stringify(bumped, null, 2));
  const result = registry.checkCompatibility('test-contract', { fromVersion: '1.0.0', toVersion: '1.1.0' });
  assert.strictEqual(result.ok, false);
  assert.ok(result.messages.some((message) => message.includes('email')));
});

test('bump creates new semver version with updated metadata', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'data-spine-bump-'));
  const registry = new SchemaRegistry({ contractsDir: tmpDir });
  registry.initContract('bump-test', {
    classification: ['PII'],
    fieldPolicies: [
      { field: 'id', action: 'pass' },
      { field: 'email', action: 'tokenize' }
    ]
  });
  const result = registry.bumpVersion('bump-test', 'minor');
  assert.strictEqual(result.version, '1.1.0');
  const schema = JSON.parse(fs.readFileSync(result.schemaPath, 'utf8'));
  assert.strictEqual(schema['x-data-spine'].version, '1.1.0');
  assert.strictEqual(schema['x-data-spine'].provenance.bumpedFrom, '1.0.0');
});

test('produces residency audit report without non compliant entries for bundled schemas', () => {
  const registry = new SchemaRegistry();
  const report = registry.generateResidencyAudit();
  assert.ok(report.contracts.length > 0);
  assert.strictEqual(report.nonCompliant.length, 0);
});
