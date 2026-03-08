"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalTrafficSteering = exports.GlobalTrafficSteering = void 0;
const residency_guard_js_1 = require("../../data-residency/residency-guard.js");
const RegionalFailoverService_js_1 = require("../../services/RegionalFailoverService.js");
const regional_config_js_1 = require("../../config/regional-config.js");
class GlobalTrafficSteering {
    static instance;
    currentRegion;
    constructor() {
        this.currentRegion = (0, regional_config_js_1.getCurrentRegion)();
    }
    static getInstance() {
        if (!GlobalTrafficSteering.instance) {
            GlobalTrafficSteering.instance = new GlobalTrafficSteering();
        }
        return GlobalTrafficSteering.instance;
    }
    /**
     * Resolves the steering action based on the routing decision.
     */
    async resolveSteeringAction(tenantId) {
        const decision = await this.resolveRegion(tenantId);
        if (decision.targetRegion === this.currentRegion) {
            return { action: 'ALLOW', reason: decision.reason };
        }
        const targetUrl = regional_config_js_1.REGIONAL_CONFIG[decision.targetRegion]?.baseUrl;
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
    async resolveRegion(tenantId) {
        const guard = residency_guard_js_1.ResidencyGuard.getInstance();
        const config = await guard.getResidencyConfig(tenantId);
        if (!config) {
            return {
                targetRegion: this.currentRegion,
                isOptimal: true,
                reason: 'No residency configuration found, defaulting to local region.'
            };
        }
        const primaryRegion = config.primaryRegion;
        const failoverService = RegionalFailoverService_js_1.RegionalFailoverService.getInstance();
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
exports.GlobalTrafficSteering = GlobalTrafficSteering;
exports.globalTrafficSteering = GlobalTrafficSteering.getInstance();
