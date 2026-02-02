import { ResidencyGuard } from '../../data-residency/residency-guard.js';
import { RegionalFailoverService } from '../../services/RegionalFailoverService.js';

export interface RoutingDecision {
    targetRegion: string;
    isOptimal: boolean;
    reason: string;
}

export class GlobalTrafficSteering {
    private static instance: GlobalTrafficSteering;
    private currentRegion: string;

    private constructor() {
        this.currentRegion = process.env.SUMMIT_REGION || process.env.REGION || 'us-east-1';
    }

    public static getInstance(): GlobalTrafficSteering {
        if (!GlobalTrafficSteering.instance) {
            GlobalTrafficSteering.instance = new GlobalTrafficSteering();
        }
        return GlobalTrafficSteering.instance;
    }

    /**
     * Resolves the optimal region for a given tenant.
     * Uses residency configurations to determine if the local region is appropriate.
     */
    async resolveRegion(tenantId: string): Promise<RoutingDecision> {
        const guard = ResidencyGuard.getInstance();
        const config = await guard.getResidencyConfig(tenantId);

        if (!config) {
            return {
                targetRegion: this.currentRegion,
                isOptimal: true,
                reason: 'No residency configuration found, defaulting to local region.'
            };
        }

        const primaryRegion = config.primaryRegion;
        const failoverService = RegionalFailoverService.getInstance();

        // 1. Resolve effective target based on health
        const effectiveTarget = failoverService.resolveTargetRegion(primaryRegion);

        if (effectiveTarget !== primaryRegion) {
            return {
                targetRegion: effectiveTarget,
                isOptimal: false,
                reason: `Primary region ${primaryRegion} is DOWN. Failing over to ${effectiveTarget}.`
            };
        }

        // 2. Check if we are already in the optimal region
        if (primaryRegion === this.currentRegion) {
            return {
                targetRegion: this.currentRegion,
                isOptimal: true,
                reason: 'Current region matches tenant primary residency and is healthy.'
            };
        }

        const isAllowed = config.allowedRegions.includes(this.currentRegion);
        if (isAllowed && config.residencyMode !== 'strict') {
            return {
                targetRegion: this.currentRegion,
                isOptimal: true,
                reason: 'Current region is an allowed secondary region (Preferred mode) and is healthy.'
            };
        }

        return {
            targetRegion: primaryRegion,
            isOptimal: false,
            reason: `Routing to tenant primary region: ${primaryRegion} (Current: ${this.currentRegion})`
        };
    }
}

export const globalTrafficSteering = GlobalTrafficSteering.getInstance();
