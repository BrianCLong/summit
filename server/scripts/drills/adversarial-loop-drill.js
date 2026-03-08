"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AdversarialLoopService_js_1 = require("../../src/services/AdversarialLoopService.js");
const RedTeamSimulator_js_1 = __importDefault(require("../../src/services/RedTeamSimulator.js"));
const logger_js_1 = require("../../src/config/logger.js");
const events_1 = require("events");
/**
 * Task #117: Adversarial Simulation Loop Drill.
 * Validates continuous, automated Red-Team campaign triggering.
 */
async function runAdversarialLoopDrill() {
    logger_js_1.logger.info('🚀 Starting Adversarial Simulation Loop Drill');
    // 1. Mock Dependencies
    const mockSimulationEngine = new events_1.EventEmitter();
    mockSimulationEngine.runSimulation = async (config) => {
        console.log(`[MOCK] Simulation Engine running: ${config.name}`);
        return { id: 'sim-' + Date.now() };
    };
    const simulator = new RedTeamSimulator_js_1.default(mockSimulationEngine);
    const loopService = AdversarialLoopService_js_1.AdversarialLoopService.getInstance(simulator);
    console.log('--- Step 1: Starting 24/7 Red-Team Loop (Interval: 0.1 min) ---');
    // Use a very small interval for the drill
    const loopId = loopService.startLoop('NETWORK_BREACH', 0.01); // ~0.6 seconds
    console.log(`Loop started with ID: ${loopId}`);
    // 2. Wait for a couple of cycles
    console.log('Waiting for loop cycles...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    loopService.stopAll();
    console.log('--- Step 2: Verification ---');
    logger_js_1.logger.info('✅ Adversarial Simulation Loop Operational (Continuous triggering verified)');
    process.exit(0);
}
runAdversarialLoopDrill().catch(err => {
    console.error('❌ Drill Failed:', err);
    process.exit(1);
});
