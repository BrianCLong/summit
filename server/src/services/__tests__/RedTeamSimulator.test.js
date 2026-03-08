"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const events_1 = require("events");
// Mock dependencies
globals_1.jest.unstable_mockModule('../../utils/logger.js', () => ({
    __esModule: true,
    default: {
        info: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
    }
}));
globals_1.jest.unstable_mockModule('../../lib/events/event-bus.js', () => {
    const eventBus = new events_1.EventEmitter();
    return { eventBus };
});
// Mock SimulationEngineService as a class that extends EventEmitter
class MockSimulationEngineService extends events_1.EventEmitter {
    runSimulation = globals_1.jest.fn();
    getSimulationStatus = globals_1.jest.fn();
}
(0, globals_1.describe)('RedTeamSimulator', () => {
    let RedTeamSimulator;
    let eventBus;
    let redTeamSimulator;
    let mockEngine;
    (0, globals_1.beforeAll)(async () => {
        ({ RedTeamSimulator } = await Promise.resolve().then(() => __importStar(require('../RedTeamSimulator.js'))));
        ({ eventBus } = await Promise.resolve().then(() => __importStar(require('../../lib/events/event-bus.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        // Instantiate the mock engine
        mockEngine = new MockSimulationEngineService();
        // Spy on the 'on' method to verify listeners are attached
        globals_1.jest.spyOn(mockEngine, 'on');
        redTeamSimulator = new RedTeamSimulator(mockEngine);
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('should initialize successfully', () => {
        // Re-initialize to capture constructor calls
        mockEngine = new MockSimulationEngineService();
        globals_1.jest.spyOn(mockEngine, 'on');
        redTeamSimulator = new RedTeamSimulator(mockEngine);
        (0, globals_1.expect)(redTeamSimulator).toBeDefined();
        (0, globals_1.expect)(mockEngine.on).toHaveBeenCalledWith('simulationCompleted', globals_1.expect.any(Function));
        (0, globals_1.expect)(mockEngine.on).toHaveBeenCalledWith('simulationFailed', globals_1.expect.any(Function));
    });
    (0, globals_1.it)('should run a phishing campaign successfully', async () => {
        const mockSimulationResult = { id: 'sim-123', status: 'INITIALIZING' };
        mockEngine.runSimulation.mockResolvedValue(mockSimulationResult);
        const eventSpy = globals_1.jest.spyOn(eventBus, 'emit');
        const result = await redTeamSimulator.runCampaign('PHISHING_CAMPAIGN', 'target-org-1');
        (0, globals_1.expect)(result).toHaveProperty('campaignId');
        (0, globals_1.expect)(result.simulationId).toBe('sim-123');
        // Verify engine was called with correct config for phishing
        (0, globals_1.expect)(mockEngine.runSimulation).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            name: 'PHISHING_CAMPAIGN against target-org-1',
            scenario: 'SOCIO_COGNITIVE',
            engines: globals_1.expect.arrayContaining(['NETWORK_PROPAGATION']),
            parameters: globals_1.expect.objectContaining({
                propagationRate: 0.4
            })
        }));
        // Verify event emission
        (0, globals_1.expect)(eventSpy).toHaveBeenCalledWith('red-team:campaign-started', globals_1.expect.objectContaining({
            simulationId: 'sim-123',
            type: 'PHISHING_CAMPAIGN'
        }));
    });
    (0, globals_1.it)('should run a network breach campaign successfully', async () => {
        const mockSimulationResult = { id: 'sim-456', status: 'INITIALIZING' };
        mockEngine.runSimulation.mockResolvedValue(mockSimulationResult);
        await redTeamSimulator.runCampaign('NETWORK_BREACH', 'target-org-2');
        // Verify engine was called with correct config for breach
        (0, globals_1.expect)(mockEngine.runSimulation).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            name: 'NETWORK_BREACH against target-org-2',
            scenario: 'CYBER_PHYSICAL',
            engines: globals_1.expect.arrayContaining(['RISK_ASSESSMENT', 'EVENT_CASCADE']),
            parameters: globals_1.expect.objectContaining({
                propagationRate: 0.6
            })
        }));
    });
    (0, globals_1.it)('should throw error for unknown campaign type', async () => {
        await (0, globals_1.expect)(redTeamSimulator.runCampaign('UNKNOWN_TYPE', 'target'))
            .rejects.toThrow('Unknown campaign type: UNKNOWN_TYPE');
    });
    (0, globals_1.it)('should handle engine failure', async () => {
        mockEngine.runSimulation.mockRejectedValue(new Error('Engine failed'));
        await (0, globals_1.expect)(redTeamSimulator.runCampaign('PHISHING_CAMPAIGN', 'target'))
            .rejects.toThrow('Engine failed');
    });
    (0, globals_1.it)('should retrieve campaign status', async () => {
        const mockSimulationResult = { id: 'sim-123', status: 'RUNNING' };
        mockEngine.runSimulation.mockResolvedValue(mockSimulationResult);
        mockEngine.getSimulationStatus.mockReturnValue({ status: 'RUNNING', progress: 0.5 });
        const { campaignId } = await redTeamSimulator.runCampaign('PHISHING_CAMPAIGN', 'target');
        const status = redTeamSimulator.getCampaignStatus(campaignId);
        (0, globals_1.expect)(mockEngine.getSimulationStatus).toHaveBeenCalledWith('sim-123');
        (0, globals_1.expect)(status).toEqual({ status: 'RUNNING', progress: 0.5 });
    });
});
