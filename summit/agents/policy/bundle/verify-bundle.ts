import fs from 'node:fs';
import yaml from 'js-yaml';
import { sha256, stableStringify } from '../../../../packages/dpec/src/hash';
import type { BundleEnv, BundleVerificationResult, PolicyBundle } from './types';

function loadBundle(env: BundleEnv, bundlePath?: string): PolicyBundle {
  const target = bundlePath ?? `summit/agents/policy/policy-bundle.${env}.json`;
  return JSON.parse(fs.readFileSync(target, 'utf8')) as PolicyBundle;
}

export function verifyBundle(env: BundleEnv, bundlePath?: string): BundleVerificationResult {
  const errors: string[] = [];
  const target = bundlePath ?? `summit/agents/policy/policy-bundle.${env}.json`;

  if (!fs.existsSync(target)) {
    return { ok: false, errors: [`Missing bundle file: ${target}`] };
  }

  const bundle = loadBundle(env, target);

  if (bundle.bundle_version !== 1) {
    errors.push(`Unsupported bundle_version=${bundle.bundle_version}`);
  }
  if (bundle.policy_version !== 1) {
    errors.push(`Unsupported policy_version=${bundle.policy_version}`);
  }

  if (!fs.existsSync(bundle.policy_path)) {
    errors.push(`Policy path not found: ${bundle.policy_path}`);
  } else {
    const policyText = fs.readFileSync(bundle.policy_path, 'utf8');
    const policyHash = sha256(stableStringify(yaml.load(policyText)));
    if (policyHash !== bundle.policy_sha256) {
      errors.push('policy_sha256 mismatch');
    }
  }

  if (!fs.existsSync(bundle.skills_path)) {
    errors.push(`Skills snapshot path not found: ${bundle.skills_path}`);
  } else {
    const snapshot = JSON.parse(fs.readFileSync(bundle.skills_path, 'utf8'));
    const skillsHash = sha256(stableStringify(snapshot));
    if (skillsHash !== bundle.skills_sha256) {
      errors.push('skills_sha256 mismatch');
    }
  }

  if (env === 'prod') {
    if (!bundle.approvals.includes('governance')) {
      errors.push('prod bundle requires approvals containing "governance"');
    }

    if (!Array.isArray(bundle.signatures) || bundle.signatures.length === 0) {
      errors.push('prod bundle requires at least one signature');
    } else {
      for (const [index, sig] of bundle.signatures.entries()) {
        if (!sig || sig.type !== 'sha256' || !sig.signer || !sig.sig) {
          errors.push(`invalid signature at index ${index}`);
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const env = (process.argv[2] ?? 'dev') as BundleEnv;
  const result = verifyBundle(env);
  if (!result.ok) {
    console.error(result.errors.join('\n'));
    process.exit(1);
  }
  console.log(`Bundle verification passed for ${env}`);
}
