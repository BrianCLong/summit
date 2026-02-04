import { readFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashFile } from './hash_weights.mjs';
import pkg from 'js-yaml';
const { load } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../../../');
const POLICY_DIR = join(REPO_ROOT, '.github/policies/model-sandbox');

function loadYaml(filename) {
  const path = join(POLICY_DIR, filename);
  if (!existsSync(path)) return null;
  return load(readFileSync(path, 'utf8'));
}

async function validate(config) {
  const errors = [];

  // 1. User check (non-root)
  if (!config.user || config.user === '0' || config.user === 'root' || config.user.startsWith('0:')) {
    errors.push("POLICY_VIOLATION: Container must run as non-root user.");
  }

  // 2. Read-only rootfs check
  if (config.readOnly !== true) {
    errors.push("POLICY_VIOLATION: Root filesystem must be read-only.");
  }

  // 3. Seccomp check
  if (!config.seccomp || !config.seccomp.includes('security-profile.json')) {
    errors.push("POLICY_VIOLATION: Custom seccomp profile missing or incorrect.");
  }

  // 4. Forbidden mounts
  const forbidden = ['.ssh', '.aws', '.kube', '.git'];
  if (config.mounts) {
    for (const mount of config.mounts) {
      if (forbidden.some(f => mount.includes(f))) {
        errors.push(`POLICY_VIOLATION: Forbidden mount detected: ${mount}`);
      }
    }
  }

  // 5. Egress check
  const egressPolicy = loadYaml('egress-allowlist.yml');
  if (egressPolicy && egressPolicy.egress && egressPolicy.egress.deny_by_default) {
    if (config.network !== 'none' && !config.egress_allowlisted) {
        // Placeholder for future egress validation logic
    }
  }

  // 6. Model hash check
  if (config.modelPath) {
    const modelAllowlist = loadYaml('model-allowlist.yml');
    const absoluteModelPath = resolve(REPO_ROOT, config.modelPath);
    const actualHash = await hashFile(absoluteModelPath);
    const entry = modelAllowlist.models.find(m => m.sha256 === actualHash);
    if (!entry) {
        errors.push(`POLICY_VIOLATION: Model hash mismatch or model not allowlisted. Hash: ${actualHash}`);
    }
  }

  return errors;
}

if (process.argv[1].endsWith('run_policy_check.mjs')) {
    const configPath = process.argv[2];
    if (!configPath) {
      console.error("Usage: node run_policy_check.mjs <config_json_path>");
      process.exit(1);
    }

    try {
        const config = JSON.parse(readFileSync(resolve(configPath), 'utf8'));
        validate(config).then(errors => {
          if (errors.length > 0) {
            errors.forEach(e => console.error(e));
            process.exit(1);
          } else {
            console.log("Policy check passed.");
          }
        }).catch(err => {
          console.error(err);
          process.exit(1);
        });
    } catch (e) {
        console.error("Failed to read or parse config:", e.message);
        process.exit(1);
    }
}

export { validate };
