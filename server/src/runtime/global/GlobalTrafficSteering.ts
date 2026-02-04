import { ResidencyGuard } from '../../data-residency/residency-guard.js';

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

        if (primaryRegion === this.currentRegion) {
            return {
                targetRegion: this.currentRegion,
                isOptimal: true,
                reason: 'Current region matches tenant primary residency.'
            };
        }

        // If current region is in allowedRegions, it might be "optimal enough" for read operations
        // but for Task #96 we focus on primary steering.
        const isAllowed = config.allowedRegions.includes(this.currentRegion);

        if (isAllowed && config.residencyMode !== 'strict') {
            return {
                targetRegion: this.currentRegion,
                isOptimal: true,
                reason: 'Current region is an allowed secondary region (Preferred mode).'
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
