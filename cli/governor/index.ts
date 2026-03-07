// cli/governor/index.ts

import { buildPlan, executeReadOnly, writeArtifacts, GovernorInput } from '../../packages/governor-core/src/planner.js';

export async function runGovernor(input: GovernorInput) {
  const plan = buildPlan(input);
  const result = await executeReadOnly(plan);
  await writeArtifacts(result);
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  let mode: any = 'advisory';
  const modeIndex = args.indexOf('--mode');
  if (modeIndex !== -1 && args[modeIndex + 1]) {
    mode = args[modeIndex + 1];
  }

  await runGovernor({
    commitSha: process.env.GITHUB_SHA || 'local-dev',
    policyVersion: '1.0.0',
    mode
  });
}

if (process.argv[1] && process.argv[1].endsWith('cli/governor/index.ts')) {
  main().catch(console.error);
}
