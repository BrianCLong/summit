import { readFile, readdir } from 'fs/promises';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const FIXTURE_ROOT = path.resolve('tests/fixtures/evidence/agent-ops');
const SCHEMA_ROOT = path.resolve('src/agents/evidence/schemas');

const SECRET_VALUE_REGEX =
  /(AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{16,}|Bearer\s+[A-Za-z0-9._-]+)/;
const TIMESTAMP_KEY_REGEX = /time|timestamp|createdAt|created_at/i;

const stableStringify = (value) => {
  const sortKeys = (input) => {
    if (Array.isArray(input)) {
      return input.map(sortKeys);
    }
    if (input && typeof input === 'object') {
      return Object.keys(input)
        .sort()
        .reduce((acc, key) => {
          acc[key] = sortKeys(input[key]);
          return acc;
        }, {});
    }
    return input;
  };
  return JSON.stringify(sortKeys(value), null, 2);
};

const loadJson = async (filePath) =>
  JSON.parse(await readFile(filePath, 'utf8'));

const loadAllowlist = async () => {
  const allowlistPath = path.resolve('src/agents/ops/allowlist.ts');
  const contents = await readFile(allowlistPath, 'utf8');
  const matches = contents.match(/'([^']+)'/g) ?? [];
  return new Set(matches.map((entry) => entry.replace(/'/g, '')));
};

const loadSchemas = async () => {
  const schemaFiles = [
    'report.schema.json',
    'metrics.schema.json',
    'stamp.schema.json',
    'index.schema.json',
  ];
  const schemas = await Promise.all(
    schemaFiles.map(async (file) => loadJson(path.join(SCHEMA_ROOT, file))),
  );
  const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
  addFormats(ajv);
  schemas.forEach((schema) => ajv.addSchema(schema));

  return {
    validateReport: ajv.getSchema(
      'https://summit.local/schemas/agent-trace/report.schema.json',
    ),
    validateMetrics: ajv.getSchema(
      'https://summit.local/schemas/agent-trace/metrics.schema.json',
    ),
    validateStamp: ajv.getSchema(
      'https://summit.local/schemas/agent-trace/stamp.schema.json',
    ),
    validateIndex: ajv.getSchema(
      'https://summit.local/schemas/agent-trace/index.schema.json',
    ),
  };
};

const collectIndexFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectIndexFiles(fullPath);
      }
      return entry.name === 'index.json' &&
        path.basename(path.dirname(fullPath)) === 'evidence'
        ? [fullPath]
        : [];
    }),
  );
  return files.flat();
};

const assertNoTimestampKeys = (value, label) => {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoTimestampKeys(entry, `${label}[${index}]`),
    );
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, entry]) => {
      if (TIMESTAMP_KEY_REGEX.test(key)) {
        throw new Error(`Timestamp field detected in ${label}.${key}`);
      }
      assertNoTimestampKeys(entry, `${label}.${key}`);
    });
  }
};

const assertNoSecrets = (value, label) => {
  if (typeof value === 'string' && SECRET_VALUE_REGEX.test(value)) {
    throw new Error(`Secret detected in ${label}`);
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoSecrets(entry, `${label}[${index}]`),
    );
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, entry]) => {
      assertNoSecrets(entry, `${label}.${key}`);
    });
  }
};

const assertDeterministic = async (filePath, data) => {
  const expected = `${stableStringify(data)}\n`;
  const actual = await readFile(filePath, 'utf8');
  if (expected !== actual) {
    throw new Error(`Non-deterministic ordering detected in ${filePath}`);
  }
};

const validateBundle = async (indexPath, validators, allowlist) => {
  const index = await loadJson(indexPath);
  if (!validators.validateIndex(index)) {
    throw new Error(
      `Index schema violation: ${JSON.stringify(validators.validateIndex.errors)}`,
    );
  }

  const evidenceDir = path.dirname(indexPath);
  const bundleRoot = path.dirname(evidenceDir);
  const reportPath = path.join(bundleRoot, index.files.report);
  const metricsPath = path.join(bundleRoot, index.files.metrics);
  const stampPath = path.join(bundleRoot, index.files.stamp);

  const report = await loadJson(reportPath);
  const metrics = await loadJson(metricsPath);
  const stamp = await loadJson(stampPath);

  if (!validators.validateReport(report)) {
    throw new Error(
      `Report schema violation: ${JSON.stringify(validators.validateReport.errors)}`,
    );
  }
  if (!validators.validateMetrics(metrics)) {
    throw new Error(
      `Metrics schema violation: ${JSON.stringify(validators.validateMetrics.errors)}`,
    );
  }
  if (!validators.validateStamp(stamp)) {
    throw new Error(
      `Stamp schema violation: ${JSON.stringify(validators.validateStamp.errors)}`,
    );
  }

  report.ops.forEach((op) => {
    if (!allowlist.has(op.type)) {
      throw new Error(`Unknown event type in report: ${op.type}`);
    }
  });

  assertNoTimestampKeys(report, 'report');
  assertNoTimestampKeys(metrics, 'metrics');
  assertNoSecrets(report, 'report');
  assertNoSecrets(metrics, 'metrics');

  await assertDeterministic(reportPath, report);
  await assertDeterministic(metricsPath, metrics);
  await assertDeterministic(indexPath, index);
};

const run = async () => {
  const [validators, allowlist] = await Promise.all([
    loadSchemas(),
    loadAllowlist(),
  ]);
  const indexFiles = await collectIndexFiles(FIXTURE_ROOT);
  if (indexFiles.length === 0) {
    throw new Error('No evidence fixtures found');
  }

  const failures = [];
  for (const indexPath of indexFiles) {
    const isNegative = indexPath.includes(`${path.sep}invalid-`);
    try {
      await validateBundle(indexPath, validators, allowlist);
      if (isNegative) {
        failures.push({
          indexPath,
          message: 'Expected fixture failure but validation passed.',
        });
      }
    } catch (error) {
      if (!isNegative) {
        failures.push({ indexPath, message: error.message });
      }
    }
  }

  if (failures.length) {
    failures.forEach((failure) => {
      console.error(`evidence-verify: FAIL ${failure.indexPath}`);
      console.error(failure.message);
    });
    process.exit(1);
  }

  console.log('evidence-verify: PASS');
};

run().catch((error) => {
  console.error(`evidence-verify: FAIL ${error.message}`);
  process.exit(1);
});
