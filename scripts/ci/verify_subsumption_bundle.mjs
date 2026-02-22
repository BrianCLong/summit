#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const bundleArgIndex = args.indexOf('--bundle');
const fixtureArgIndex = args.indexOf('--fixture');
const bundlePath = bundleArgIndex >= 0 ? args[bundleArgIndex + 1] : 'subsumption/item-UNKNOWN';
const fixtureRoot = fixtureArgIndex >= 0 ? args[fixtureArgIndex + 1] : null;

const repoRoot = process.cwd();
const docTargets = [
  'docs/repo_assumptions.md',
  'docs/required_checks.todo.md',
  'docs/standards/item-UNKNOWN.md',
  'docs/security/data-handling/item-UNKNOWN.md',
  'docs/ops/runbooks/item-UNKNOWN.md',
  'docs/decisions/item-UNKNOWN.md',
  'docs/assumptions/item-UNKNOWN.md',
];
const schemaPaths = [
  'evidence/schemas/report.schema.json',
  'evidence/schemas/metrics.schema.json',
  'evidence/schemas/stamp.schema.json',
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function exists(targetPath) {
  try {
    fs.accessSync(targetPath);
    return true;
  } catch {
    return false;
  }
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function hasTimestampValue(value) {
  if (typeof value === 'string') {
    return /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
  }
  return false;
}

function scanForTimestamps(node, trail = []) {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      const result = scanForTimestamps(node[i], trail.concat(String(i)));
      if (result) {
        return result;
      }
    }
    return null;
  }

  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      const lowerKey = key.toLowerCase();
      if (['created_at', 'generated_at', 'timestamp', 'createdat', 'generatedat'].includes(lowerKey)) {
        return trail.concat(key).join('.');
      }
      if (hasTimestampValue(value)) {
        return trail.concat(key).join('.');
      }
      const nested = scanForTimestamps(value, trail.concat(key));
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function checkBundle(bundleDir, { docRoot, enforceSchemas, enforceEvidenceIndex, enforceFixtures }) {
  const errors = [];
  const checks = [];

  const manifestPath = path.join(bundleDir, 'manifest.yaml');
  if (!exists(manifestPath)) {
    errors.push(`Missing manifest.yaml at ${manifestPath}`);
  } else {
    checks.push(manifestPath);
  }

  for (const docPath of docTargets) {
    const target = path.join(docRoot, docPath);
    if (!exists(target)) {
      errors.push(`Missing docs target: ${docPath}`);
    } else {
      checks.push(target);
    }
  }

  if (enforceSchemas) {
    for (const schemaPath of schemaPaths) {
      const target = path.join(repoRoot, schemaPath);
      if (!exists(target)) {
        errors.push(`Missing schema: ${schemaPath}`);
      } else {
        checks.push(target);
      }
    }
  }

  if (enforceEvidenceIndex) {
    const indexPath = path.join(repoRoot, 'evidence/index.json');
    if (!exists(indexPath)) {
      errors.push('Missing evidence/index.json');
    } else {
      checks.push(indexPath);
    }
  }

  if (enforceFixtures) {
    const fixturePath = path.join(repoRoot, 'scripts/ci/__fixtures__/subsumption/item-UNKNOWN');
    if (!exists(fixturePath)) {
      errors.push(`Missing fixtures directory: ${fixturePath}`);
    } else {
      checks.push(fixturePath);
    }
  }

  const reportPath = path.join(bundleDir, 'report.json');
  const metricsPath = path.join(bundleDir, 'metrics.json');
  if (exists(reportPath)) {
    const reportData = readJson(reportPath);
    const timestampTrail = scanForTimestamps(reportData);
    if (timestampTrail) {
      errors.push(`Report contains timestamp-like value at ${timestampTrail}`);
    }
  }
  if (exists(metricsPath)) {
    const metricsData = readJson(metricsPath);
    const timestampTrail = scanForTimestamps(metricsData);
    if (timestampTrail) {
      errors.push(`Metrics contains timestamp-like value at ${timestampTrail}`);
    }
  }

  return { errors, checks };
}

function listFixtureDirs(rootDir) {
  if (!exists(rootDir)) {
    return { positive: [], negative: [] };
  }
  const positiveDir = path.join(rootDir, 'positive');
  const negativeDir = path.join(rootDir, 'negative');
  const listChildren = (dirPath) =>
    exists(dirPath)
      ? fs
          .readdirSync(dirPath)
          .map((entry) => path.join(dirPath, entry))
          .filter((entry) => fs.statSync(entry).isDirectory())
      : [];
  return {
    positive: listChildren(positiveDir),
    negative: listChildren(negativeDir),
  };
}

const metrics = {
  files_checked: 0,
  fixtures_checked: 0,
  fixtures_passed: 0,
  fixtures_failed: 0,
  violations: 0,
};

if (fixtureRoot) {
  const fixtureDirs = listFixtureDirs(fixtureRoot);
  const allFixtures = [...fixtureDirs.positive, ...fixtureDirs.negative];
  if (allFixtures.length === 0) {
    fail(`No fixtures found in ${fixtureRoot}`);
  }

  for (const fixtureDir of fixtureDirs.positive) {
    const result = checkBundle(fixtureDir, {
      docRoot: fixtureDir,
      enforceSchemas: false,
      enforceEvidenceIndex: true,
      enforceFixtures: false,
    });
    metrics.fixtures_checked += 1;
    metrics.files_checked += result.checks.length;
    if (result.errors.length === 0) {
      metrics.fixtures_passed += 1;
    } else {
      metrics.fixtures_failed += 1;
      metrics.violations += result.errors.length;
      fail(`Positive fixture failed (${fixtureDir}):\n- ${result.errors.join('\n- ')}`);
    }
  }

  for (const fixtureDir of fixtureDirs.negative) {
    const result = checkBundle(fixtureDir, {
      docRoot: fixtureDir,
      enforceSchemas: false,
      enforceEvidenceIndex: true,
      enforceFixtures: false,
    });
    metrics.fixtures_checked += 1;
    metrics.files_checked += result.checks.length;
    if (result.errors.length === 0) {
      metrics.fixtures_failed += 1;
      fail(`Negative fixture unexpectedly passed (${fixtureDir}).`);
    } else {
      metrics.fixtures_passed += 1;
      metrics.violations += result.errors.length;
    }
  }
} else {
  const result = checkBundle(path.resolve(bundlePath), {
    docRoot: repoRoot,
    enforceSchemas: true,
    enforceEvidenceIndex: true,
    enforceFixtures: true,
  });
  metrics.files_checked += result.checks.length;
  metrics.violations += result.errors.length;
  if (result.errors.length > 0) {
    fail(`verify_subsumption_bundle failed:\n- ${result.errors.join('\n- ')}`);
  }
}

const outDir = path.join(repoRoot, 'evidence/runs/verify_subsumption_bundle');
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
  path.join(outDir, 'report.json'),
  JSON.stringify(
    {
      version: 1,
      evidence_id: 'EVD-ITEMUNKNOWN-CI-001',
      item_slug: 'item-UNKNOWN',
      claims: [],
      decisions: ['Generated by verify_subsumption_bundle'],
    },
    null,
    2,
  ),
);

fs.writeFileSync(
  path.join(outDir, 'metrics.json'),
  JSON.stringify(
    {
      version: 1,
      evidence_id: 'EVD-ITEMUNKNOWN-CI-001',
      counters: metrics,
    },
    null,
    2,
  ),
);

fs.writeFileSync(
  path.join(outDir, 'stamp.json'),
  JSON.stringify(
    {
      version: 1,
      evidence_id: 'EVD-ITEMUNKNOWN-CI-001',
      tool: 'verify_subsumption_bundle@0.1.0',
      generated_at: new Date().toISOString(),
    },
    null,
    2,
  ),
);

console.log('OK: verify_subsumption_bundle');
