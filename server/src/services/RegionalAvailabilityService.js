"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegionalAvailabilityService = void 0;
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class RegionalAvailabilityService {
    static instance;
    state = {
        regions: {
            'us-east-1': { status: 'HEALTHY', lastUpdated: new Date() },
            'us-west-2': { status: 'HEALTHY', lastUpdated: new Date() }, // DR for us-east-1
            'eu-central-1': { status: 'HEALTHY', lastUpdated: new Date() },
            'eu-west-1': { status: 'HEALTHY', lastUpdated: new Date() }, // DR for eu-central-1
        },
        failoverMode: 'AUTOMATIC',
    };
    constructor() { }
    static getInstance() {
        if (!RegionalAvailabilityService.instance) {
            RegionalAvailabilityService.instance = new RegionalAvailabilityService();
        }
        return RegionalAvailabilityService.instance;
    }
    getStatus() {
        return this.state;
    }
    setRegionStatus(region, status) {
        if (!this.state.regions[region]) {
            throw new Error(`Unknown region: ${region}`);
        }
        this.state.regions[region] = { status, lastUpdated: new Date() };
        logger_js_1.default.info(`Region ${region} status set to ${status}`);
    }
    setFailoverMode(mode) {
        this.state.failoverMode = mode;
        logger_js_1.default.info(`Failover mode set to ${mode}`);
    }
    reset() {
        this.state = {
            regions: {
                'us-east-1': { status: 'HEALTHY', lastUpdated: new Date() },
                'us-west-2': { status: 'HEALTHY', lastUpdated: new Date() },
                'eu-central-1': { status: 'HEALTHY', lastUpdated: new Date() },
                'eu-west-1': { status: 'HEALTHY', lastUpdated: new Date() },
            },
            failoverMode: 'AUTOMATIC',
        };
        logger_js_1.default.info('Regional availability state reset');
    }
}
exports.RegionalAvailabilityService = RegionalAvailabilityService;
