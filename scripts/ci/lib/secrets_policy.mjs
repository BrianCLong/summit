import crypto from 'crypto';
import fs from 'fs';
import yaml from 'js-yaml';

const REQUIRED_RULE_FIELDS = ['id', 'pattern', 'severity'];
const REQUIRED_ALLOWLIST_FIELDS = [
  'id',
  'rule_id',
  'path',
  'match_hash',
  'expires',
  'rationale',
];

export function loadSecretsPolicy(policyPath) {
  const raw = fs.readFileSync(policyPath, 'utf8');
  const policy = yaml.load(raw);
  validatePolicy(policy, policyPath);
  const policyHash = crypto.createHash('sha256').update(raw).digest('hex');
  return { policy, policyHash, raw };
}

export function resolveOutputDir(outputDirTemplate, sha) {
  return outputDirTemplate.replace(/\$\{sha\}/g, sha);
}

function validatePolicy(policy, policyPath) {
  if (!policy || typeof policy !== 'object') {
    throw new Error(`Invalid policy: ${policyPath} is not a YAML object.`);
  }

  if (policy.schema_version !== '1') {
    throw new Error(`Invalid policy: schema_version must be "1" in ${policyPath}.`);
  }

  if (!policy.scan || typeof policy.scan !== 'object') {
    throw new Error(`Invalid policy: missing scan section in ${policyPath}.`);
  }

  if (!Array.isArray(policy.scan.include_globs)) {
    throw new Error(`Invalid policy: scan.include_globs must be an array in ${policyPath}.`);
  }

  if (!Array.isArray(policy.scan.exclude_globs)) {
    throw new Error(`Invalid policy: scan.exclude_globs must be an array in ${policyPath}.`);
  }

  if (
    typeof policy.scan.max_file_size_bytes !== 'number' ||
    Number.isNaN(policy.scan.max_file_size_bytes)
  ) {
    throw new Error(`Invalid policy: scan.max_file_size_bytes must be a number in ${policyPath}.`);
  }

  if (!Array.isArray(policy.rules) || policy.rules.length === 0) {
    throw new Error(`Invalid policy: rules must be a non-empty array in ${policyPath}.`);
  }

  for (const rule of policy.rules) {
    for (const field of REQUIRED_RULE_FIELDS) {
      if (!rule?.[field]) {
        throw new Error(`Invalid policy: rule missing ${field} in ${policyPath}.`);
      }
    }
  }

  if (policy.allowlist) {
    if (!Array.isArray(policy.allowlist)) {
      throw new Error(`Invalid policy: allowlist must be an array in ${policyPath}.`);
    }

    for (const entry of policy.allowlist) {
      for (const field of REQUIRED_ALLOWLIST_FIELDS) {
        if (!entry?.[field]) {
          throw new Error(`Invalid policy: allowlist entry missing ${field} in ${policyPath}.`);
        }
      }

      if (!/^[a-fA-F0-9]{64}$/.test(entry.match_hash) && !entry.match_hash.includes('<')) {
        throw new Error(`Invalid policy: allowlist entry match_hash must be sha256 in ${policyPath}.`);
      }

      const expires = new Date(`${entry.expires}T00:00:00Z`);
      if (Number.isNaN(expires.getTime())) {
        throw new Error(`Invalid policy: allowlist entry expires must be YYYY-MM-DD in ${policyPath}.`);
      }
    }
  }

  if (!policy.output?.out_dir) {
    throw new Error(`Invalid policy: output.out_dir required in ${policyPath}.`);
  }
}
