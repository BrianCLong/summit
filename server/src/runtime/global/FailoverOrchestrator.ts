import axios from 'axios';
import { REGIONAL_CONFIG, getCurrentRegion } from '../../config/regional-config.js';
import { RegionalAvailabilityService, RegionStatus } from '../../services/RegionalAvailabilityService.js';
import logger from '../../utils/logger.js';

export class FailoverOrchestrator {
    private static instance: FailoverOrchestrator;
    private intervalId: NodeJS.Timeout | null = null;
    private readonly CHECK_INTERVAL_MS = 30000; // 30 seconds
    private readonly FAILURE_THRESHOLD = 3;
    private failureCounts: Record<string, number> = {};

    private constructor() { }

    public static getInstance(): FailoverOrchestrator {
        if (!FailoverOrchestrator.instance) {
            FailoverOrchestrator.instance = new FailoverOrchestrator();
        }
        return FailoverOrchestrator.instance;
    }

    public start(): void {
        if (this.intervalId) return;

        logger.info('FailoverOrchestrator: Starting regional health monitoring');
        this.intervalId = setInterval(() => this.checkHealth(), this.CHECK_INTERVAL_MS);
    }

    public stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private async checkHealth(): Promise<void> {
        const currentRegion = getCurrentRegion();
        const availability = RegionalAvailabilityService.getInstance();
        const status = availability.getStatus();

        if (status.failoverMode !== 'AUTOMATIC') {
            logger.debug('FailoverOrchestrator: Automatic failover is disabled, skipping health checks');
            return;
        }

        for (const [region, config] of Object.entries(REGIONAL_CONFIG)) {
            if (region === currentRegion) continue;

            try {
                // Ping the health endpoint of the remote region
                await axios.get(`${config.baseUrl}/api/health`, { timeout: 5000 });

                if (this.failureCounts[region] > 0) {
                    logger.info({ region }, 'FailoverOrchestrator: Region recovered');
                    this.failureCounts[region] = 0;
                    availability.setRegionStatus(region, 'HEALTHY');
                }
            } catch (error: any) {
                this.failureCounts[region] = (this.failureCounts[region] || 0) + 1;

                logger.warn({
                    region,
                    failureCount: this.failureCounts[region],
                    error: error.message
                }, 'FailoverOrchestrator: Regional health check failed');

                if (this.failureCounts[region] >= this.FAILURE_THRESHOLD) {
                    const currentState = status.regions[region];
                    if (currentState && currentState.status !== 'DOWN') {
                        logger.error({ region }, 'FailoverOrchestrator: Region threshold exceeded. Marking region as DOWN.');
                        availability.setRegionStatus(region, 'DOWN');
                    }
                }
            }
        }
    }
}

export const failoverOrchestrator = FailoverOrchestrator.getInstance();
