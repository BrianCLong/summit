import { ResidencyGuard } from '../../data-residency/residency-guard.js';
import { RegionalFailoverService } from '../../services/RegionalFailoverService.js';
import { REGIONAL_CONFIG, getCurrentRegion } from '../../config/regional-config.js';

export interface RoutingDecision {
    targetRegion: string;
    isOptimal: boolean;
    reason: string;
}

export class GlobalTrafficSteering {
    private static instance: GlobalTrafficSteering;
    private currentRegion: string;

    private constructor() {
        this.currentRegion = getCurrentRegion();
    }

    public static getInstance(): GlobalTrafficSteering {
        if (!GlobalTrafficSteering.instance) {
            GlobalTrafficSteering.instance = new GlobalTrafficSteering();
        }
        return GlobalTrafficSteering.instance;
    }

    /**
     * Resolves the steering action based on the routing decision.
     */
    async resolveSteeringAction(tenantId: string): Promise<{ action: 'ALLOW' | 'REDIRECT'; targetUrl?: string; reason: string }> {
        const decision = await this.resolveRegion(tenantId);

        if (decision.targetRegion === this.currentRegion) {
            return { action: 'ALLOW', reason: decision.reason };
        }

        const targetUrl = REGIONAL_CONFIG[decision.targetRegion]?.baseUrl;
        if (!targetUrl) {
            return { action: 'ALLOW', reason: `${decision.reason} (No URL mapping for ${decision.targetRegion})` };
        }

        return {
            action: 'REDIRECT',
            targetUrl,
            reason: decision.reason
        };
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
