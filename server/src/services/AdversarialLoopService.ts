
import { logger } from '../config/logger.js';
import RedTeamSimulator, { CampaignType } from './RedTeamSimulator.js';
import { randomUUID } from 'crypto';

/**
 * Service for Adversarial Simulation Loops (Task #117).
 * Continuously executes red-team campaigns to test platform defenses 24/7.
 */
export class AdversarialLoopService {
  private static instance: AdversarialLoopService;
  private simulator: RedTeamSimulator;
  private activeLoops: Map<string, NodeJS.Timeout> = new Map();

  private constructor(simulator: RedTeamSimulator) {
    this.simulator = simulator;
  }

  public static getInstance(simulator: RedTeamSimulator): AdversarialLoopService {
    if (!AdversarialLoopService.instance) {
      AdversarialLoopService.instance = new AdversarialLoopService(simulator);
    }
    return AdversarialLoopService.instance;
  }

  /**
   * Starts a continuous simulation loop.
   */
  public startLoop(type: CampaignType, intervalMinutes: number = 60): string {
    const loopId = randomUUID();
    logger.info({ loopId, type, intervalMinutes }, 'AdversarialLoop: Starting continuous simulation loop');

    const runCampaign = async () => {
      try {
        const targetId = `auto-target-${Math.floor(Math.random() * 1000)}`;
        logger.info({ loopId, type, targetId }, 'AdversarialLoop: Triggering scheduled campaign');

        await this.simulator.runCampaign(type, targetId, {
          name: `AutoLoop: ${type}`,
          severity: 'high'
        });
      } catch (err: any) {
        logger.error({ loopId, error: err.message }, 'AdversarialLoop: Campaign trigger failed');
      }
    };

    // Immediate run
    runCampaign();

    const interval = setInterval(runCampaign, intervalMinutes * 60 * 1000);
    this.activeLoops.set(loopId, interval);

    return loopId;
  }

  /**
   * Stops an active simulation loop.
   */
  public stopLoop(loopId: string): void {
    const interval = this.activeLoops.get(loopId);
    if (interval) {
      clearInterval(interval);
      this.activeLoops.delete(loopId);
      logger.info({ loopId }, 'AdversarialLoop: Simulation loop stopped');
    }
  }

  /**
   * Stops all active loops.
   */
  public stopAll(): void {
    for (const loopId of this.activeLoops.keys()) {
      this.stopLoop(loopId);
    }
  }
}
