import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const evidenceMapPath = path.resolve(rootDir, 'docs/ga/evidence_map.yml');

const requiredFields = [
  'id',
  'claim',
  'paths',
  'verify',
  'success',
  'scope',
  'severity',
];

const allowedScopes = new Set(['ga', 'security', 'ops', 'docs', 'demo']);
const allowedSeverities = new Set(['info', 'low', 'med', 'high']);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeEntryLabel(entry, index) {
  if (isNonEmptyString(entry?.id)) {
    return entry.id;
  }
  return `entry-${index + 1}`;
}

function loadEvidenceMap() {
  if (!fs.existsSync(evidenceMapPath)) {
    console.error(`Missing evidence map: ${evidenceMapPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(evidenceMapPath, 'utf8');
  const parsed = yaml.load(content);

  if (!Array.isArray(parsed)) {
    console.error('Evidence map must be a YAML array of entries.');
    process.exit(1);
  }

  return parsed;
}

function main() {
  const entries = loadEvidenceMap();
  const missingFields = [];
  const missingFiles = [];
  const duplicateIds = [];
  const seenIds = new Set();
  const scopeCounts = new Map();

  entries.forEach((entry, index) => {
    const label = normalizeEntryLabel(entry, index);

    if (isNonEmptyString(entry?.id)) {
      if (seenIds.has(entry.id)) {
        duplicateIds.push(entry.id);
      }
      seenIds.add(entry.id);
    }

    requiredFields.forEach(field => {
      const value = entry?.[field];
      if (field === 'paths') {
        if (!Array.isArray(value) || value.length === 0) {
          missingFields.push(`${label}: paths`);
        }
      } else if (!isNonEmptyString(value)) {
        missingFields.push(`${label}: ${field}`);
      }
    });

    if (entry?.paths && Array.isArray(entry.paths)) {
      entry.paths.forEach((entryPath) => {
        if (!isNonEmptyString(entryPath)) {
          missingFields.push(`${label}: paths[]`);
          return;
        }
        const fullPath = path.resolve(rootDir, entryPath);
        if (!fs.existsSync(fullPath)) {
          missingFiles.push(`${label}: ${entryPath}`);
        }
      });
    }

    if (isNonEmptyString(entry?.scope) && !allowedScopes.has(entry.scope)) {
      missingFields.push(`${label}: scope`);
    }

    if (isNonEmptyString(entry?.severity) && !allowedSeverities.has(entry.severity)) {
      missingFields.push(`${label}: severity`);
    }

    const scopeKey = isNonEmptyString(entry?.scope) ? entry.scope : 'unknown';
    scopeCounts.set(scopeKey, (scopeCounts.get(scopeKey) || 0) + 1);
  });

  console.log(`Evidence map entries: ${entries.length}`);
  console.log('Counts by scope:');
  ['ga', 'security', 'ops', 'docs', 'demo', 'unknown'].forEach(scope => {
    if (scopeCounts.has(scope)) {
      console.log(`- ${scope}: ${scopeCounts.get(scope)}`);
    }
  });

  if (duplicateIds.length > 0) {
    console.log('Duplicate IDs detected:');
    duplicateIds.forEach(id => console.log(`- ${id}`));
  }

  if (missingFields.length > 0) {
    console.log('Missing or invalid fields:');
    missingFields.forEach(field => console.log(`- ${field}`));
  }

  if (missingFiles.length > 0) {
    console.log('Missing referenced files:');
    missingFiles.forEach(file => console.log(`- ${file}`));
  }

  const hasFailures = missingFields.length > 0 || missingFiles.length > 0 || duplicateIds.length > 0;

  if (hasFailures) {
    process.exit(1);
  }

  console.log('Evidence map validation passed.');
}

main();
