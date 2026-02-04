import { spawnSync } from 'child_process';

/**
 * Generic runner for Supply Chain Guard gates.
 * Usage: node scripts/ci/run_supplychain_gate.mjs <path-to-gate-ts-file>
 *
 * This wrapper ensures the gate is executed with 'tsx' to handle TypeScript compilation on the fly.
 */

const target = process.argv[2];
if (!target) {
    console.error('Usage: node scripts/ci/run_supplychain_gate.mjs <gate-script.ts>');
    process.exit(1);
}

console.log(`[SupplyChainGuard] Executing gate: ${target}`);

const res = spawnSync('npx', ['tsx', target], { stdio: 'inherit', shell: true });
process.exit(res.status ?? 1);
