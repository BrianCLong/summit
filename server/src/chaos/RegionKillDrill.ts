
import { logger } from '../config/logger.js';
import { RegionalAvailabilityService } from '../services/RegionalAvailabilityService.js';
import { globalTrafficSteering } from '../runtime/global/GlobalTrafficSteering.js';
import { regionalFailoverService } from '../services/RegionalFailoverService.js';

export interface DrillResult {
  region: string;
  drPair: string;
  success: boolean;
  steps: string[];
}

/**
 * Automates Region-Kill Drills and Failover Testing (Chaos Engineering v2).
 */
export class RegionKillDrill {
  private static instance: RegionKillDrill;

  private constructor() {}

  public static getInstance(): RegionKillDrill {
    if (!RegionKillDrill.instance) {
      RegionKillDrill.instance = new RegionKillDrill();
    }
    return RegionKillDrill.instance;
  }

  /**
   * Executes a region-kill drill.
   * 1. Marks region as DOWN.
   * 2. Verifies that traffic is steered to DR pair.
   * 3. Recovers the region.
   */
  public async executeDrill(region: string, tenantId: string): Promise<DrillResult> {
    const availability = RegionalAvailabilityService.getInstance();
    const drPair = regionalFailoverService.getDRPair(region);

    if (!drPair) {
      throw new Error(`Region ${region} has no defined DR pair`);
    }

    const steps: string[] = [];
    logger.info({ region, drPair }, 'Starting Region-Kill Drill');
    steps.push(`Target region: ${region}, DR Pair: ${drPair}`);

    try {
      // 1. Kill Region
      availability.setRegionStatus(region, 'DOWN');
      steps.push(`Action: Marked ${region} as DOWN`);

      // 2. Verify Steering
      const decision = await globalTrafficSteering.resolveRegion(tenantId);
      steps.push(`Steering Decision: Target=${decision.targetRegion}, Reason=${decision.reason}`);

      const success = decision.targetRegion === drPair;
      if (success) {
        steps.push('Validation: Success - Traffic correctly steered to DR pair');
      } else {
        steps.push(`Validation: FAILED - Expected steering to ${drPair}, but got ${decision.targetRegion}`);
      }

      // 3. Recover Region
      availability.setRegionStatus(region, 'HEALTHY');
      steps.push(`Action: Recovered ${region} to HEALTHY`);

      return {
        region,
        drPair,
        success,
        steps
      };
    } catch (err: any) {
      logger.error({ err }, 'Region-Kill Drill failed');
      // Ensure recovery
      availability.setRegionStatus(region, 'HEALTHY');
      throw err;
    }
  }
}

export const regionKillDrill = RegionKillDrill.getInstance();
