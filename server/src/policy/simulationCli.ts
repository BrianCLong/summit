import { appLogger } from '../logging/structuredLogger.js';
import { runPolicySimulationCli } from './tenantBundle.js';

runPolicySimulationCli().catch((error) => {
  appLogger.fatal({ error }, 'Policy simulation failed');
  process.exit(1);
});
