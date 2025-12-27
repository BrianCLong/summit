import logger from '../utils/logger.js';

export type RegionStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN';
export type FailoverMode = 'AUTOMATIC' | 'MANUAL_PROMOTION_ACTIVE';

interface RegionState {
  status: RegionStatus;
  lastUpdated: Date;
}

interface SystemStatus {
  regions: Record<string, RegionState>;
  failoverMode: FailoverMode;
}

export class RegionalAvailabilityService {
  private static instance: RegionalAvailabilityService;
  private state: SystemStatus = {
    regions: {
      'us-east-1': { status: 'HEALTHY', lastUpdated: new Date() },
      'us-west-2': { status: 'HEALTHY', lastUpdated: new Date() }, // DR for us-east-1
      'eu-central-1': { status: 'HEALTHY', lastUpdated: new Date() },
      'eu-west-1': { status: 'HEALTHY', lastUpdated: new Date() }, // DR for eu-central-1
    },
    failoverMode: 'AUTOMATIC',
  };

  private constructor() {}

  public static getInstance(): RegionalAvailabilityService {
    if (!RegionalAvailabilityService.instance) {
      RegionalAvailabilityService.instance = new RegionalAvailabilityService();
    }
    return RegionalAvailabilityService.instance;
  }

  public getStatus(): SystemStatus {
    return this.state;
  }

  public setRegionStatus(region: string, status: RegionStatus): void {
    if (!this.state.regions[region]) {
      throw new Error(`Unknown region: ${region}`);
    }
    this.state.regions[region] = { status, lastUpdated: new Date() };
    logger.info(`Region ${region} status set to ${status}`);
  }

  public setFailoverMode(mode: FailoverMode): void {
    this.state.failoverMode = mode;
    logger.info(`Failover mode set to ${mode}`);
  }

  public reset(): void {
    this.state = {
        regions: {
          'us-east-1': { status: 'HEALTHY', lastUpdated: new Date() },
          'us-west-2': { status: 'HEALTHY', lastUpdated: new Date() },
          'eu-central-1': { status: 'HEALTHY', lastUpdated: new Date() },
          'eu-west-1': { status: 'HEALTHY', lastUpdated: new Date() },
        },
        failoverMode: 'AUTOMATIC',
      };
      logger.info('Regional availability state reset');
  }
}
