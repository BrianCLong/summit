import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const ARTIFACT_DIR = 'artifacts/vibe-stack';

export function stableSort(value) {
  if (Array.isArray(value)) {
    return value.map(stableSort);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = stableSort(value[key]);
        return acc;
      }, {});
  }
  return value;
}

export function writeJsonDeterministic(path, payload) {
  mkdirSync(dirname(path), { recursive: true });
  const sorted = stableSort(payload);
  writeFileSync(path, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
}

export function writeArtifacts({ report, metrics, stamp }) {
  writeJsonDeterministic(`${ARTIFACT_DIR}/report.json`, report);
  writeJsonDeterministic(`${ARTIFACT_DIR}/metrics.json`, metrics);
  writeJsonDeterministic(`${ARTIFACT_DIR}/stamp.json`, stamp);
}

export function getGitSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}
