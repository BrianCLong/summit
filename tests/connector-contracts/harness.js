const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');

const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const CONTRACTS_ROOT = path.resolve(__dirname, '../../connectors/contracts');
const SCHEMA_PATH = path.join(CONTRACTS_ROOT, 'schema/connector.manifest.v1.schema.json');
const REFERENCE_ROOT = path.join(CONTRACTS_ROOT, 'reference');

const CONTRACT_FLAG_VALUES = new Set(['1', 'true', 'TRUE', 'on', 'yes']);

function loadSchema() {
  const contents = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  return JSON.parse(contents);
}

function buildValidator() {
  const schema = loadSchema();
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  return { ajv, validate, schema };
}

function discoverManifests(root = REFERENCE_ROOT) {
  const manifests = [];
  if (!fs.existsSync(root)) {
    return manifests;
  }

  const queue = [root];
  while (queue.length > 0) {
    const current = queue.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
      } else if (entry.isFile() && entry.name === 'connector.manifest.json') {
        manifests.push(fullPath);
      }
    }
  }
  return manifests;
}

function loadManifest(manifestPath) {
  const contents = fs.readFileSync(manifestPath, 'utf-8');
  return JSON.parse(contents);
}

function contractsEnabled() {
  const flag = process.env.CONNECTOR_CONTRACTS;
  return flag && CONTRACT_FLAG_VALUES.has(String(flag));
}

function formatAjvErrors(errors = []) {
  return errors.map((error) => {
    const location = error.instancePath || '<root>';
    return `${location} ${error.message}`;
  });
}

function loadHandler(manifestPath, manifest) {
  const baseDir = path.dirname(manifestPath);
  const handlerPath = path.resolve(baseDir, manifest.mapping.handler || './mapper.js');
  return require(handlerPath);
}

function loadFixture(manifestPath, manifest) {
  const baseDir = path.dirname(manifestPath);
  const fixturePath = path.resolve(baseDir, manifest.fixtures.sample);
  const contents = fs.readFileSync(fixturePath, 'utf-8');
  return { data: JSON.parse(contents), path: fixturePath };
}

function loadGolden(manifestPath, manifest) {
  const baseDir = path.dirname(manifestPath);
  const goldenPath = path.resolve(baseDir, manifest.fixtures.golden);
  const contents = fs.readFileSync(goldenPath, 'utf-8');
  return { data: JSON.parse(contents), path: goldenPath };
}

function checkSnapshotStability(normalized, manifest, golden) {
  const snapshotVersion = manifest.contracts?.snapshotVersion;
  const generatedAt = manifest.contracts?.generatedAt;

  const versionMatches =
    normalized.snapshotVersion &&
    snapshotVersion &&
    normalized.snapshotVersion === snapshotVersion &&
    (!golden || golden.snapshotVersion === snapshotVersion);
  const timestampMatches =
    normalized.generatedAt &&
    generatedAt &&
    normalized.generatedAt === generatedAt &&
    (!golden || golden.generatedAt === generatedAt);

  return {
    versionMatches,
    timestampMatches,
    stable: Boolean(versionMatches && timestampMatches),
  };
}

function runConnector(manifestPath, validator) {
  const { validate } = validator || buildValidator();
  const manifest = loadManifest(manifestPath);

  const valid = validate(manifest);
  if (!valid) {
    return {
      status: 'failed',
      manifestPath,
      connectorId: manifest.connectorId || 'unknown',
      errors: formatAjvErrors(validate.errors),
    };
  }

  if (!contractsEnabled()) {
    return {
      status: 'skipped',
      manifestPath,
      connectorId: manifest.connectorId,
      reason: 'CONNECTOR_CONTRACTS flag is not enabled',
    };
  }

  const handler = loadHandler(manifestPath, manifest);
  if (!handler || typeof handler.buildNormalizedOutput !== 'function') {
    return {
      status: 'failed',
      manifestPath,
      connectorId: manifest.connectorId,
      errors: ['mapping.handler must export buildNormalizedOutput(fixture, manifest)'],
    };
  }

  const fixture = loadFixture(manifestPath, manifest);
  const golden = loadGolden(manifestPath, manifest);

  const normalized = handler.buildNormalizedOutput(fixture.data, manifest, fixture.path);
  const stability = checkSnapshotStability(normalized, manifest, golden.data);
  const matches = isDeepStrictEqual(normalized, golden.data);
  const errors = [];
  if (!matches) {
    errors.push('normalized output does not match golden snapshot');
  }
  if (!stability.stable) {
    errors.push('snapshot metadata is not stable');
  }

  return {
    status: matches && stability.stable ? 'passed' : 'failed',
    manifestPath,
    connectorId: manifest.connectorId,
    normalized,
    golden: golden.data,
    stability,
    errors,
  };
}

function runSuite(manifestPaths = discoverManifests(), validator) {
  const results = manifestPaths.map((manifestPath) => runConnector(manifestPath, validator));
  const summary = results.reduce(
    (acc, result) => {
      acc.total += 1;
      acc[result.status] += 1;
      if (result.status === 'failed') {
        acc.failures.push({
          connectorId: result.connectorId,
          manifestPath: result.manifestPath,
          errors: result.errors || [],
          stability: result.stability,
        });
      }
      if (result.status === 'skipped') {
        acc.skippedList.push({
          connectorId: result.connectorId,
          manifestPath: result.manifestPath,
          reason: result.reason,
        });
      }
      return acc;
    },
    { total: 0, passed: 0, failed: 0, skipped: 0, failures: [], skippedList: [] }
  );

  return { results, summary };
}

module.exports = {
  buildValidator,
  discoverManifests,
  runConnector,
  runSuite,
  loadSchema,
};
