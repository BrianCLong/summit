"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.regionKillDrill = exports.RegionKillDrill = void 0;
const logger_js_1 = require("../config/logger.js");
const RegionalAvailabilityService_js_1 = require("../services/RegionalAvailabilityService.js");
const GlobalTrafficSteering_js_1 = require("../runtime/global/GlobalTrafficSteering.js");
const RegionalFailoverService_js_1 = require("../services/RegionalFailoverService.js");
/**
 * Automates Region-Kill Drills and Failover Testing (Chaos Engineering v2).
 */
class RegionKillDrill {
    static instance;
    constructor() { }
    static getInstance() {
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
    async executeDrill(region, tenantId) {
        const availability = RegionalAvailabilityService_js_1.RegionalAvailabilityService.getInstance();
        const drPair = RegionalFailoverService_js_1.regionalFailoverService.getDRPair(region);
        if (!drPair) {
            throw new Error(`Region ${region} has no defined DR pair`);
        }
        const steps = [];
        logger_js_1.logger.info({ region, drPair }, 'Starting Region-Kill Drill');
        steps.push(`Target region: ${region}, DR Pair: ${drPair}`);
        try {
            // 1. Kill Region
            availability.setRegionStatus(region, 'DOWN');
            steps.push(`Action: Marked ${region} as DOWN`);
            // 2. Verify Steering
            const decision = await GlobalTrafficSteering_js_1.globalTrafficSteering.resolveRegion(tenantId);
            steps.push(`Steering Decision: Target=${decision.targetRegion}, Reason=${decision.reason}`);
            const success = decision.targetRegion === drPair;
            if (success) {
                steps.push('Validation: Success - Traffic correctly steered to DR pair');
            }
            else {
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
        }
        catch (err) {
            logger_js_1.logger.error({ err }, 'Region-Kill Drill failed');
            // Ensure recovery
            availability.setRegionStatus(region, 'HEALTHY');
            throw err;
        }
    }
}
exports.RegionKillDrill = RegionKillDrill;
exports.regionKillDrill = RegionKillDrill.getInstance();
