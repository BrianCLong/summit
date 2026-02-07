import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const schemaPaths = [
  'src/agents/evidence/schemas/report.schema.json',
  'src/agents/evidence/schemas/metrics.schema.json',
  'src/agents/evidence/schemas/stamp.schema.json',
  'src/agents/evidence/schemas/index.schema.json',
];

const errors = [];

for (const schemaPath of schemaPaths) {
  if (!existsSync(schemaPath)) {
    errors.push(`Missing schema file: ${schemaPath}`);
  }
}

const timestampKeyRegex = /(time|date|generated_at)/i;

function findTimestampKeys(value, path = '') {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      findTimestampKeys(entry, `${path}[${index}]`),
    );
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, entry]) => {
      const nextPath = path ? `${path}.${key}` : key;
      if (timestampKeyRegex.test(key)) {
        return [nextPath];
      }
      return findTimestampKeys(entry, nextPath);
    });
  }
  return [];
}

function parseJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`Invalid JSON: ${filePath} (${error.message})`);
    return null;
  }
}

function validateNoTimestampKeys(filePath) {
  const data = parseJson(filePath);
  if (!data) return;
  const violations = findTimestampKeys(data);
  if (violations.length > 0) {
    errors.push(
      `Timestamp-like keys found in ${filePath}: ${violations.join(', ')}`,
    );
  }
}

if (existsSync('evidence/index.json')) {
  validateNoTimestampKeys('evidence/index.json');
}

const runsDir = 'evidence/runs';
if (existsSync(runsDir)) {
  const runEntries = readdirSync(runsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const runId of runEntries) {
    const runPath = join(runsDir, runId);
    const reportPath = join(runPath, 'report.json');
    const metricsPath = join(runPath, 'metrics.json');
    const stampPath = join(runPath, 'stamp.json');

    if (existsSync(reportPath)) {
      validateNoTimestampKeys(reportPath);
    }
    if (existsSync(metricsPath)) {
      validateNoTimestampKeys(metricsPath);
    }
    if (existsSync(stampPath)) {
      parseJson(stampPath);
    }
  }
}

if (errors.length > 0) {
  console.error('Evidence validation failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
} else {
  console.log('Evidence validation passed.');
}
