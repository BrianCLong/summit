const fs = require('node:fs');
const path = require('node:path');
const harness = require('./harness');

describe('connector contract harness', () => {
  const validator = harness.buildValidator();

  beforeAll(() => {
    process.env.CONNECTOR_CONTRACTS = '1';
  });

  test('invalid manifests fail schema validation', () => {
    const invalidPath = path.resolve(__dirname, 'fixtures/invalid-manifest.json');
    const invalidManifest = JSON.parse(fs.readFileSync(invalidPath, 'utf-8'));
    const valid = validator.validate(invalidManifest);
    expect(valid).toBe(false);
    expect(validator.validate.errors).toBeDefined();
  });

  test('reference connectors replay fixtures and match golden snapshots', () => {
    const manifests = harness.discoverManifests();
    const { summary, results } = harness.runSuite(manifests, validator);

    expect(summary.failed).toBe(0);
    expect(summary.skipped).toBe(0);
    expect(summary.passed).toBe(manifests.length);

    results.forEach((result) => {
      expect(result.status).toBe('passed');
      expect(result.stability.stable).toBe(true);
    });
  });

  test('snapshots remain stable across runs', () => {
    const manifests = harness.discoverManifests();

    manifests.forEach((manifestPath) => {
      const runResult = harness.runConnector(manifestPath, validator);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      expect(runResult.status).toBe('passed');
      expect(runResult.normalized.snapshotVersion).toEqual(manifest.contracts.snapshotVersion);
      expect(runResult.normalized.generatedAt).toEqual(manifest.contracts.generatedAt);
    });
  });
});
