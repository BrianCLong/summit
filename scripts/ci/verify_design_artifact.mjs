#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const EVIDENCE_ID_PATTERN = /^SUMMIT-DESIGN-[0-9]{6}-[A-F0-9]{12}$/;
const TIMESTAMP_KEY_PATTERN = /(time|date|timestamp|generated|created|updated|finished|started|ended|_at|At)$/i;

function parseArgs(argv) {
  const out = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) {
      continue;
    }

    if (current.includes('=')) {
      const [key, value] = current.split('=');
      out[key.slice(2)] = value;
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      out[current.slice(2)] = 'true';
      continue;
    }

    out[current.slice(2)] = next;
    index += 1;
  }

  return out;
}

function normalizePath(target) {
  return target.split(path.sep).join('/');
}

function gitRefExists(ref) {
  try {
    execSync(`git rev-parse --verify ${ref}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function resolveBaseRef(candidate) {
  if (candidate && gitRefExists(candidate)) {
    return candidate;
  }

  const githubBaseRef = process.env.GITHUB_BASE_REF;
  if (githubBaseRef) {
    const fromOrigin = `origin/${githubBaseRef}`;
    if (gitRefExists(fromOrigin)) {
      return fromOrigin;
    }
  }

  if (gitRefExists('origin/main')) {
    return 'origin/main';
  }

  return 'HEAD~1';
}

function listChangedFiles(baseRef, headRef) {
  const output = execSync(
    `git diff --name-only --diff-filter=AM ${baseRef}...${headRef}`,
    { encoding: 'utf8' },
  );

  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function collectTimestampKeys(value, prefix = '') {
  const matches = [];

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      matches.push(...collectTimestampKeys(entry, `${prefix}[${index}]`));
    });
    return matches;
  }

  if (!value || typeof value !== 'object') {
    return matches;
  }

  Object.entries(value).forEach(([key, child]) => {
    const nextPath = prefix ? `${prefix}.${key}` : key;
    if (TIMESTAMP_KEY_PATTERN.test(key)) {
      matches.push(nextPath);
    }
    matches.push(...collectTimestampKeys(child, nextPath));
  });

  return matches;
}

function failWithMessages(messages) {
  console.error('Design artifact verification failed:');
  messages.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

function validateChangedArtifactPath(filePath, failures) {
  const normalized = normalizePath(filePath);
  if (!normalized.startsWith('artifacts/ui-design/')) {
    return;
  }

  if (normalized.includes('/../') || normalized.includes('..')) {
    failures.push(`Invalid traversal sequence detected in changed path: ${normalized}`);
    return;
  }

  const parts = normalized.split('/');
  if (parts.length < 4) {
    failures.push(`Invalid design artifact path depth: ${normalized}`);
    return;
  }

  const designId = parts[2];
  const relative = parts.slice(3).join('/');

  const allowedRootFiles = new Set(['design.json', 'screens.json', 'report.json', 'metrics.json', 'stamp.json']);
  const allowedAsset = relative.startsWith('html/') || relative.startsWith('css/');

  if (!allowedAsset && !allowedRootFiles.has(relative)) {
    failures.push(`Disallowed artifact write path: ${normalized}`);
  }

  if (!/^[a-z0-9][a-z0-9-]{2,63}$/i.test(designId)) {
    failures.push(`Invalid design id in artifact path: ${normalized}`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function validateEvidenceIds(report, metrics, stamp, designId, failures) {
  const ids = [report.evidence_id, metrics.evidence_id, stamp.evidence_id];

  ids.forEach((evidenceId, index) => {
    if (typeof evidenceId !== 'string' || !EVIDENCE_ID_PATTERN.test(evidenceId)) {
      failures.push(`Invalid evidence ID format at index ${index}: ${String(evidenceId)}`);
    }
  });

  if (ids[0] !== ids[1] || ids[0] !== ids[2]) {
    failures.push(`Evidence ID mismatch for design ${designId}`);
  }
}

function validateDesignDirectory(repoRoot, designId, failures) {
  const artifactDir = path.join(repoRoot, 'artifacts', 'ui-design', designId);
  const required = ['design.json', 'screens.json', 'report.json', 'metrics.json', 'stamp.json'];

  required.forEach((name) => {
    const fullPath = path.join(artifactDir, name);
    if (!fs.existsSync(fullPath)) {
      failures.push(`Missing required artifact file for ${designId}: ${normalizePath(path.relative(repoRoot, fullPath))}`);
    }
  });

  if (failures.length > 0) {
    return;
  }

  const report = readJson(path.join(artifactDir, 'report.json'));
  const metrics = readJson(path.join(artifactDir, 'metrics.json'));
  const stamp = readJson(path.join(artifactDir, 'stamp.json'));

  validateEvidenceIds(report, metrics, stamp, designId, failures);

  if (report.design_id !== designId || metrics.design_id !== designId || stamp.design_id !== designId) {
    failures.push(`Design ID mismatch across triad for ${designId}`);
  }

  if (!Array.isArray(report.written_paths) || report.written_paths.length === 0) {
    failures.push(`report.json must declare non-empty written_paths for ${designId}`);
  } else {
    report.written_paths.forEach((entry) => {
      if (typeof entry !== 'string' || !entry.startsWith(`artifacts/ui-design/${designId}/`)) {
        failures.push(`Invalid written_paths entry for ${designId}: ${String(entry)}`);
      }
    });
  }

  if (typeof stamp.content_hash !== 'string' || stamp.content_hash.length < 16) {
    failures.push(`stamp.json missing content_hash for ${designId}`);
  }

  const timestampViolations = [
    ...collectTimestampKeys(report).map((entry) => `report.json:${entry}`),
    ...collectTimestampKeys(metrics).map((entry) => `metrics.json:${entry}`),
    ...collectTimestampKeys(stamp).map((entry) => `stamp.json:${entry}`),
  ];

  timestampViolations.forEach((violation) => {
    failures.push(`Non-deterministic timestamp-like key found for ${designId}: ${violation}`);
  });

  const htmlDir = path.join(artifactDir, 'html');
  if (fs.existsSync(htmlDir)) {
    const htmlFiles = fs.readdirSync(htmlDir).sort((a, b) => a.localeCompare(b));
    htmlFiles.forEach((fileName) => {
      const html = fs.readFileSync(path.join(htmlDir, fileName), 'utf8');
      if (/<script\b/i.test(html)) {
        failures.push(`Unsafe script tag detected in sanitized html for ${designId}: ${fileName}`);
      }
    });
  }
}

function extractDesignIdsFromPaths(changedFiles) {
  const set = new Set();

  changedFiles.forEach((filePath) => {
    const normalized = normalizePath(filePath);
    if (!normalized.startsWith('artifacts/ui-design/')) {
      return;
    }

    const segments = normalized.split('/');
    if (segments.length >= 3) {
      set.add(segments[2]);
    }
  });

  return [...set].sort((a, b) => a.localeCompare(b));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(args['repo-root'] ?? process.cwd());

  const failures = [];

  if (args['design-id']) {
    validateDesignDirectory(repoRoot, args['design-id'], failures);
    if (failures.length > 0) {
      failWithMessages(failures);
    }

    console.log(`Design artifact verification passed for design id: ${args['design-id']}`);
    return;
  }

  const headRef = args.head ?? 'HEAD';
  const baseRef = resolveBaseRef(args.base);

  const changedFiles = listChangedFiles(baseRef, headRef);
  changedFiles.forEach((filePath) => validateChangedArtifactPath(filePath, failures));

  const designIds = extractDesignIdsFromPaths(changedFiles);

  if (designIds.length === 0) {
    if (failures.length > 0) {
      failWithMessages(failures);
    }

    console.log('Design artifact verification passed: no design artifact changes detected.');
    return;
  }

  designIds.forEach((designId) => validateDesignDirectory(repoRoot, designId, failures));

  if (failures.length > 0) {
    failWithMessages(failures);
  }

  console.log(`Design artifact verification passed for ${designIds.length} design artifact set(s).`);
}

main();
