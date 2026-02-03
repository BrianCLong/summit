import { spawnSync } from 'child_process';

/**
 * CI Entry point for Developer Threat Audit Gate.
 * Delegates to the generic runner wrapper.
 */

const gateEntry = 'packages/supplychain-guard/src/gates/dev_threat_audit_entry.ts';
const wrapper = 'scripts/ci/run_supplychain_gate.mjs';

console.log('Starting Developer Threat Audit Gate...');
const res = spawnSync('node', [wrapper, gateEntry], { stdio: 'inherit', shell: true });
process.exit(res.status ?? 1);
