"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.failoverOrchestrator = exports.FailoverOrchestrator = void 0;
const axios_1 = __importDefault(require("axios"));
const regional_config_js_1 = require("../../config/regional-config.js");
const RegionalAvailabilityService_js_1 = require("../../services/RegionalAvailabilityService.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
class FailoverOrchestrator {
    static instance;
    intervalId = null;
    CHECK_INTERVAL_MS = 30000; // 30 seconds
    FAILURE_THRESHOLD = 3;
    failureCounts = {};
    constructor() { }
    static getInstance() {
        if (!FailoverOrchestrator.instance) {
            FailoverOrchestrator.instance = new FailoverOrchestrator();
        }
        return FailoverOrchestrator.instance;
    }
    start() {
        if (this.intervalId)
            return;
        logger_js_1.default.info('FailoverOrchestrator: Starting regional health monitoring');
        this.intervalId = setInterval(() => this.checkHealth(), this.CHECK_INTERVAL_MS);
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    async checkHealth() {
        const currentRegion = (0, regional_config_js_1.getCurrentRegion)();
        const availability = RegionalAvailabilityService_js_1.RegionalAvailabilityService.getInstance();
        const status = availability.getStatus();
        if (status.failoverMode !== 'AUTOMATIC') {
            logger_js_1.default.debug('FailoverOrchestrator: Automatic failover is disabled, skipping health checks');
            return;
        }
        for (const [region, config] of Object.entries(regional_config_js_1.REGIONAL_CONFIG)) {
            if (region === currentRegion)
                continue;
            try {
                // Ping the health endpoint of the remote region
                await axios_1.default.get(`${config.baseUrl}/api/health`, { timeout: 5000 });
                if (this.failureCounts[region] > 0) {
                    logger_js_1.default.info({ region }, 'FailoverOrchestrator: Region recovered');
                    this.failureCounts[region] = 0;
                    availability.setRegionStatus(region, 'HEALTHY');
                }
            }
            catch (error) {
                this.failureCounts[region] = (this.failureCounts[region] || 0) + 1;
                logger_js_1.default.warn({
                    region,
                    failureCount: this.failureCounts[region],
                    error: error.message
                }, 'FailoverOrchestrator: Regional health check failed');
                if (this.failureCounts[region] >= this.FAILURE_THRESHOLD) {
                    const currentState = status.regions[region];
                    if (currentState && currentState.status !== 'DOWN') {
                        logger_js_1.default.error({ region }, 'FailoverOrchestrator: Region threshold exceeded. Marking region as DOWN.');
                        availability.setRegionStatus(region, 'DOWN');
                    }
                }
            }
        }
    }
}
exports.FailoverOrchestrator = FailoverOrchestrator;
exports.failoverOrchestrator = FailoverOrchestrator.getInstance();
