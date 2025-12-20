import { runPolicySimulationCli } from './tenantBundle.js';

runPolicySimulationCli().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
