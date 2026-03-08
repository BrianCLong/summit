"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.regionalFailoverService = exports.RegionalFailoverService = void 0;
const RegionalAvailabilityService_js_1 = require("./RegionalAvailabilityService.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class RegionalFailoverService {
    static instance;
    drPairs = {
        'us-east-1': 'us-west-2',
        'us-west-2': 'us-east-1',
        'eu-central-1': 'eu-west-1',
        'eu-west-1': 'eu-central-1'
    };
    constructor() { }
    static getInstance() {
        if (!RegionalFailoverService.instance) {
            RegionalFailoverService.instance = new RegionalFailoverService();
        }
        return RegionalFailoverService.instance;
    }
    /**
     * Resolves the target region for a given original region.
     * If the original region is DOWN, it returns the DR pair if healthy.
     */
    resolveTargetRegion(region) {
        const availability = RegionalAvailabilityService_js_1.RegionalAvailabilityService.getInstance();
        const status = availability.getStatus();
        const regionState = status.regions[region];
        if (!regionState || regionState.status !== 'DOWN') {
            return region;
        }
        const drRegion = this.drPairs[region];
        if (!drRegion) {
            logger_js_1.default.warn(`Region ${region} is DOWN but no DR pair is defined.`);
            return region;
        }
        const drState = status.regions[drRegion];
        if (drState && drState.status === 'HEALTHY') {
            logger_js_1.default.info(`Failover: Shifting traffic from ${region} (DOWN) to ${drRegion} (HEALTHY)`);
            return drRegion;
        }
        logger_js_1.default.error(`Disaster: Both ${region} and its DR pair ${drRegion} are unavailable!`);
        return region;
    }
    getDRPair(region) {
        return this.drPairs[region];
    }
}
exports.RegionalFailoverService = RegionalFailoverService;
exports.regionalFailoverService = RegionalFailoverService.getInstance();
