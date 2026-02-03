import { spawnSync } from 'child_process';

/**
 * CI Entry point for Dependency Intake Gate.
 * Delegates to the generic runner wrapper.
 */

const gateEntry = 'packages/supplychain-guard/src/gates/dependency_intake_entry.ts';
const wrapper = 'scripts/ci/run_supplychain_gate.mjs';

console.log('Starting Dependency Intake Gate...');
const res = spawnSync('node', [wrapper, gateEntry], { stdio: 'inherit', shell: true });
process.exit(res.status ?? 1);
