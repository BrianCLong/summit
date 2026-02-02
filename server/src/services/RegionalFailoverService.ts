import { RegionalAvailabilityService, RegionStatus } from './RegionalAvailabilityService.js';
import logger from '../utils/logger.js';

export interface FailoverRoute {
    originalRegion: string;
    failoverRegion: string;
    isHealthy: boolean;
}

export class RegionalFailoverService {
    private static instance: RegionalFailoverService;
    private drPairs: Record<string, string> = {
        'us-east-1': 'us-west-2',
        'us-west-2': 'us-east-1',
        'eu-central-1': 'eu-west-1',
        'eu-west-1': 'eu-central-1'
    };

    private constructor() { }

    public static getInstance(): RegionalFailoverService {
        if (!RegionalFailoverService.instance) {
            RegionalFailoverService.instance = new RegionalFailoverService();
        }
        return RegionalFailoverService.instance;
    }

    /**
     * Resolves the target region for a given original region.
     * If the original region is DOWN, it returns the DR pair if healthy.
     */
    public resolveTargetRegion(region: string): string {
        const availability = RegionalAvailabilityService.getInstance();
        const status = availability.getStatus();
        const regionState = status.regions[region];

        if (!regionState || regionState.status !== 'DOWN') {
            return region;
        }

        const drRegion = this.drPairs[region];
        if (!drRegion) {
            logger.warn(`Region ${region} is DOWN but no DR pair is defined.`);
            return region;
        }

        const drState = status.regions[drRegion];
        if (drState && drState.status === 'HEALTHY') {
            logger.info(`Failover: Shifting traffic from ${region} (DOWN) to ${drRegion} (HEALTHY)`);
            return drRegion;
        }

        logger.error(`Disaster: Both ${region} and its DR pair ${drRegion} are unavailable!`);
        return region;
    }

    public getDRPair(region: string): string | undefined {
        return this.drPairs[region];
    }
}

export const regionalFailoverService = RegionalFailoverService.getInstance();
