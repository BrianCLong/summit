import fs from 'node:fs';
import path from 'node:path';

// Determinism gate: evidence artifacts must be stable and timestamp-free outside stamp.json.

const indexPath = path.resolve('evidence/index.json');

const timestampKeys = new Set([
  'timestamp',
  'timestamps',
  'generated_at',
  'created_at',
  'updated_at',
  'time',
  'date'
]);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function findTimestampKey(value, currentPath = []) {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const found = findTimestampKey(value[i], currentPath.concat(String(i)));
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (timestampKeys.has(key)) {
        return currentPath.concat(key).join('.');
      }
      const found = findTimestampKey(child, currentPath.concat(key));
      if (found) {
        return found;
      }
    }
  }

  return null;
}

if (!fs.existsSync(indexPath)) {
  fail('missing evidence/index.json');
}

const index = readJson(indexPath);

if (!index || typeof index !== 'object' || !index.evidence) {
  fail('evidence/index.json missing evidence map');
}

const entries = Object.values(index.evidence);

for (const entry of entries) {
  if (!entry || typeof entry !== 'object' || !entry.files) {
    fail('evidence/index.json has invalid entry');
  }

  const { report, metrics, stamp } = entry.files;

  if (!report || !metrics || !stamp) {
    fail(`evidence entry missing report/metrics/stamp: ${entry.evidence_id ?? 'unknown'}`);
  }

  const reportPath = path.resolve(report);
  const metricsPath = path.resolve(metrics);
  const stampPath = path.resolve(stamp);

  if (!fs.existsSync(reportPath)) {
    fail(`missing report artifact: ${report}`);
  }
  if (!fs.existsSync(metricsPath)) {
    fail(`missing metrics artifact: ${metrics}`);
  }
  if (!fs.existsSync(stampPath)) {
    fail(`missing stamp artifact: ${stamp}`);
  }

  const reportJson = readJson(reportPath);
  const metricsJson = readJson(metricsPath);

  const reportTimestamp = findTimestampKey(reportJson);
  if (reportTimestamp) {
    fail(`timestamp field found in report.json: ${report} (${reportTimestamp})`);
  }

  const metricsTimestamp = findTimestampKey(metricsJson);
  if (metricsTimestamp) {
    fail(`timestamp field found in metrics.json: ${metrics} (${metricsTimestamp})`);
  }
}

console.log('evidence verifier: OK');
