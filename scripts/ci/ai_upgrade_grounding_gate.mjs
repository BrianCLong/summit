import { spawnSync } from 'child_process';
import path from 'path';

/**
 * CI Entry point for AI Upgrade Grounding Gate.
 * Delegates to the generic runner wrapper.
 */

const gateEntry = 'packages/supplychain-guard/src/gates/ai_grounding_entry.ts';
const wrapper = 'scripts/ci/run_supplychain_gate.mjs';

console.log('Starting AI Upgrade Grounding Gate...');
const res = spawnSync('node', [wrapper, gateEntry], { stdio: 'inherit', shell: true });
process.exit(res.status ?? 1);
