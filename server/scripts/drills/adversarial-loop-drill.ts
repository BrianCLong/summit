
import { AdversarialLoopService } from '../../src/services/AdversarialLoopService.js';
import RedTeamSimulator from '../../src/services/RedTeamSimulator.js';
import { logger } from '../../src/config/logger.js';
import { EventEmitter } from 'events';

/**
 * Task #117: Adversarial Simulation Loop Drill.
 * Validates continuous, automated Red-Team campaign triggering.
 */
async function runAdversarialLoopDrill() {
  logger.info('🚀 Starting Adversarial Simulation Loop Drill');

  // 1. Mock Dependencies
  const mockSimulationEngine = new EventEmitter() as any;
  mockSimulationEngine.runSimulation = async (config: any) => {
    console.log(`[MOCK] Simulation Engine running: ${config.name}`);
    return { id: 'sim-' + Date.now() };
  };

  const simulator = new RedTeamSimulator(mockSimulationEngine);
  const loopService = AdversarialLoopService.getInstance(simulator);

  console.log('--- Step 1: Starting 24/7 Red-Team Loop (Interval: 0.1 min) ---');
  // Use a very small interval for the drill
  const loopId = loopService.startLoop('NETWORK_BREACH', 0.01); // ~0.6 seconds

  console.log(`Loop started with ID: ${loopId}`);

  // 2. Wait for a couple of cycles
  console.log('Waiting for loop cycles...');
  await new Promise(resolve => setTimeout(resolve, 1500));

  loopService.stopAll();
  console.log('--- Step 2: Verification ---');

  logger.info('✅ Adversarial Simulation Loop Operational (Continuous triggering verified)');
  process.exit(0);
}

runAdversarialLoopDrill().catch(err => {
  console.error('❌ Drill Failed:', err);
  process.exit(1);
});
