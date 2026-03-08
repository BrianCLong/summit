"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdversarialLoopService = void 0;
const logger_js_1 = require("../config/logger.js");
const crypto_1 = require("crypto");
/**
 * Service for Adversarial Simulation Loops (Task #117).
 * Continuously executes red-team campaigns to test platform defenses 24/7.
 */
class AdversarialLoopService {
    static instance;
    simulator;
    activeLoops = new Map();
    constructor(simulator) {
        this.simulator = simulator;
    }
    static getInstance(simulator) {
        if (!AdversarialLoopService.instance) {
            AdversarialLoopService.instance = new AdversarialLoopService(simulator);
        }
        return AdversarialLoopService.instance;
    }
    /**
     * Starts a continuous simulation loop.
     */
    startLoop(type, intervalMinutes = 60) {
        const loopId = (0, crypto_1.randomUUID)();
        logger_js_1.logger.info({ loopId, type, intervalMinutes }, 'AdversarialLoop: Starting continuous simulation loop');
        const runCampaign = async () => {
            try {
                const targetId = `auto-target-${Math.floor(Math.random() * 1000)}`;
                logger_js_1.logger.info({ loopId, type, targetId }, 'AdversarialLoop: Triggering scheduled campaign');
                await this.simulator.runCampaign(type, targetId, {
                    name: `AutoLoop: ${type}`,
                    severity: 'high'
                });
            }
            catch (err) {
                logger_js_1.logger.error({ loopId, error: err.message }, 'AdversarialLoop: Campaign trigger failed');
            }
        };
        // Immediate run
        runCampaign();
        const interval = setInterval(runCampaign, intervalMinutes * 60 * 1000);
        this.activeLoops.set(loopId, interval);
        return loopId;
    }
    /**
     * Stops an active simulation loop.
     */
    stopLoop(loopId) {
        const interval = this.activeLoops.get(loopId);
        if (interval) {
            clearInterval(interval);
            this.activeLoops.delete(loopId);
            logger_js_1.logger.info({ loopId }, 'AdversarialLoop: Simulation loop stopped');
        }
    }
    /**
     * Stops all active loops.
     */
    stopAll() {
        for (const loopId of this.activeLoops.keys()) {
            this.stopLoop(loopId);
        }
    }
}
exports.AdversarialLoopService = AdversarialLoopService;
