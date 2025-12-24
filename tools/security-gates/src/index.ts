import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { enforceWorkflowGate } from './workflowGate.js';
import { enforceImageGate } from './imageGate.js';
import { scanForSecrets } from './secretScan.js';
import { enforcePolicyGate } from './policyGate.js';
import type { GateResult } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run(): Promise<void> {
  const configPath = process.argv[2] || 'security/pilot/gate-config.json';
  const repoRoot = path.resolve(__dirname, '..', '..');
  const config = loadConfig(path.resolve(repoRoot, configPath));

  const [workflow, image, secrets, policy] = await Promise.all([
    enforceWorkflowGate(repoRoot, config.workflowGate),
    enforceImageGate(repoRoot, config.imageGate),
    scanForSecrets(repoRoot, config.secretScan),
    enforcePolicyGate(repoRoot, config.policyGate)
  ]);

  const results: GateResult[] = [workflow, image, secrets, policy];
  const failures = results.filter((result) => !result.ok);

  results.forEach((result) => {
    console.log(`\n[${result.gate.toUpperCase()}] ${result.ok ? 'PASS' : 'FAIL'}`);
    result.details.forEach((detail) => console.log(` - ${detail}`));
  });

  if (failures.length) {
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
