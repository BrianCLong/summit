import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const DEFAULT_PATH = 'docs/ga/evidence_map.yml';

function loadEvidenceMap(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  const parsed = yaml.load(raw);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Evidence map must be a YAML object.');
  }
  return parsed;
}

function validateClaim(claim) {
  const failures = [];
  if (!claim || typeof claim !== 'object') {
    return ['Claim entry is not an object.'];
  }
  if (typeof claim.id !== 'string' || claim.id.trim().length === 0) {
    failures.push('Claim id must be a non-empty string.');
  }
  if (typeof claim.statement !== 'string' || claim.statement.trim().length === 0) {
    failures.push(`Claim ${claim.id ?? '<unknown>'} statement must be a non-empty string.`);
  }
  if (!Array.isArray(claim.paths) || claim.paths.length === 0) {
    failures.push(`Claim ${claim.id ?? '<unknown>'} must include paths array.`);
  } else {
    claim.paths.forEach((entry) => {
      if (typeof entry !== 'string' || entry.trim().length === 0) {
        failures.push(`Claim ${claim.id ?? '<unknown>'} has invalid path entry.`);
      } else {
        const target = path.resolve(process.cwd(), entry);
        if (!fs.existsSync(target)) {
          failures.push(`Claim ${claim.id ?? '<unknown>'} references missing path: ${entry}`);
        }
      }
    });
  }
  if (typeof claim.verify !== 'string' || claim.verify.trim().length === 0) {
    failures.push(`Claim ${claim.id ?? '<unknown>'} must include verify command.`);
  }
  if (typeof claim.indicator !== 'string' || claim.indicator.trim().length === 0) {
    failures.push(`Claim ${claim.id ?? '<unknown>'} must include indicator.`);
  }
  return failures;
}

function main() {
  const filePath = process.argv[2]?.startsWith('--path=')
    ? process.argv[2].split('=')[1]
    : DEFAULT_PATH;

  const evidenceMap = loadEvidenceMap(filePath);
  const claims = evidenceMap.claims;
  if (!Array.isArray(claims)) {
    throw new Error('Evidence map must include a claims array.');
  }

  const failures = [];
  const seen = new Set();
  claims.forEach((claim) => {
    if (claim?.id) {
      if (seen.has(claim.id)) {
        failures.push(`Duplicate claim id detected: ${claim.id}`);
      }
      seen.add(claim.id);
    }
    failures.push(...validateClaim(claim));
  });

  if (failures.length > 0) {
    failures.forEach((failure) => {
      console.error(`EVIDENCE_MAP_FAIL: ${failure}`);
    });
    process.exitCode = 1;
    return;
  }

  console.log(`Evidence map verified. Claims: ${claims.length}`);
}

main();
