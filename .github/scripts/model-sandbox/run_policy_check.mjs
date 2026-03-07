import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import yaml from 'js-yaml'; // We'll need to ensure this is available or use a simpler parser

/**
 * Policy checker for Model Sandbox.
 * Validates:
 * - Model digest against allowlist
 * - Container configuration (non-root, read-only rootfs)
 * - Egress policy
 * - Mount points
 */
async function main() {
  const args = process.argv.slice(2);
  const configPath = args[0] || '.github/policies/model-sandbox/model-allowlist.yml';
  const runConfig = JSON.parse(args[1] || '{}'); // Passed from shell script

  console.log('--- Model Sandbox Policy Check ---');

  try {
    // 1. Load Policies
    const modelAllowlist = yaml.load(await readFile('.github/policies/model-sandbox/model-allowlist.yml', 'utf8'));
    const egressPolicy = yaml.load(await readFile('.github/policies/model-sandbox/egress-allowlist.yml', 'utf8'));
    const dataPolicy = yaml.load(await readFile('.github/policies/model-sandbox/data-classification.yml', 'utf8'));

    // 2. Verify Model Digest
    const model = modelAllowlist.models.find(m => m.name === runConfig.modelName);
    if (!model) {
      throw new Error(`Model "${runConfig.modelName}" is not in the allowlist.`);
    }
    if (model.sha256 !== runConfig.modelDigest) {
      throw new Error(`Digest mismatch for ${runConfig.modelName}. Expected ${model.sha256}, got ${runConfig.modelDigest}`);
    }
    console.log(`✅ Model digest verified: ${runConfig.modelDigest}`);

    // 3. Verify Container Hardening
    if (runConfig.user === '0' || runConfig.user === 'root') {
      throw new Error('Policy Violation: Container must not run as root.');
    }
    if (!runConfig.readOnlyRootfs) {
      throw new Error('Policy Violation: Root filesystem must be read-only.');
    }
    console.log('✅ Container hardening verified (non-root, read-only rootfs)');

    // 4. Verify Egress
    if (egressPolicy.egress.mode === 'deny-all' && runConfig.networkEnabled) {
      throw new Error('Policy Violation: Network enabled but egress policy is deny-all.');
    }
    console.log(`✅ Egress policy verified: ${egressPolicy.egress.mode}`);

    // 5. Verify Mounts (Forbidden paths)
    const forbiddenPaths = ['.ssh', '.aws', '.git', 'package-lock.json'];
    const illegalMount = (runConfig.mounts || []).find(m => forbiddenPaths.some(p => m.includes(p)));
    if (illegalMount) {
      throw new Error(`Policy Violation: Forbidden mount detected: ${illegalMount}`);
    }
    console.log('✅ Mount points verified');

    console.log('--- Policy Check PASSED ---');
    process.exit(0);
  } catch (err) {
    console.error(`❌ Policy Check FAILED: ${err.message}`);
    process.exit(1);
  }
}

main();
