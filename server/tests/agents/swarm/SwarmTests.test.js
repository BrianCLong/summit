"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const database_js_1 = require("../../../src/config/database.js");
// Define mocks
const mockPublish = globals_1.jest.fn();
const mockSubscribe = globals_1.jest.fn();
const mockOn = globals_1.jest.fn();
const mockQuit = globals_1.jest.fn();
const mockDuplicate = globals_1.jest.fn(() => ({
    publish: mockPublish,
    subscribe: mockSubscribe,
    on: mockOn,
    quit: mockQuit,
}));
// Mock dependencies
globals_1.jest.mock('../../../src/config/database.js', () => ({
    getRedisClient: globals_1.jest.fn(() => ({
        duplicate: mockDuplicate,
    })),
}));
globals_1.jest.mock('../../../src/utils/logger.js', () => ({
    info: globals_1.jest.fn(),
    warn: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
    default: {
        info: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
    }
}));
const GossipProtocol_js_1 = require("../../../src/agents/swarm/GossipProtocol.js");
const ConsensusEngine_js_1 = require("../../../src/agents/swarm/ConsensusEngine.js");
const SwarmIntelligenceService_js_1 = require("../../../src/services/SwarmIntelligenceService.js");
(0, globals_1.describe)('Swarm Intelligence Layer', () => {
    let gossip;
    let consensus;
    let mockRedisClient;
    let mockPub;
    let mockSub;
    (0, globals_1.beforeEach)(async () => {
        globals_1.jest.clearAllMocks();
        database_js_1.getRedisClient.mockReturnValue({
            duplicate: mockDuplicate,
        });
        mockDuplicate.mockImplementation(() => ({
            publish: mockPublish,
            subscribe: mockSubscribe,
            on: mockOn,
            quit: mockQuit,
        }));
        gossip = new GossipProtocol_js_1.GossipProtocol('test-node-1');
        consensus = new ConsensusEngine_js_1.ConsensusEngine('test-node-1', gossip);
        consensus.setPeerCount(1); // Set low peer count for testing quorum
        await gossip.initialize();
        await consensus.initialize();
    });
    (0, globals_1.describe)('GossipProtocol', () => {
        (0, globals_1.it)('should subscribe to channels on initialization', () => {
            // In the factory, we return the SAME mockDuplicate function which returns an object.
            // So checking mockDuplicate calls works.
            (0, globals_1.expect)(mockDuplicate).toHaveBeenCalledTimes(2);
            (0, globals_1.expect)(mockSubscribe).toHaveBeenCalledWith('swarm:gossip', 'swarm:consensus');
        });
        (0, globals_1.it)('should broadcast messages', async () => {
            await gossip.broadcast('swarm:gossip', { type: 'heartbeat', payload: {} });
            (0, globals_1.expect)(mockPublish).toHaveBeenCalledWith('swarm:gossip', globals_1.expect.stringContaining('"type":"heartbeat"'));
        });
    });
    (0, globals_1.describe)('ConsensusEngine', () => {
        (0, globals_1.it)('should propose an action and broadcast it with signature', async () => {
            const id = await consensus.propose('test-action', { foo: 'bar' });
            (0, globals_1.expect)(id).toBeDefined();
            (0, globals_1.expect)(mockPublish).toHaveBeenCalledWith('swarm:consensus', globals_1.expect.stringContaining('"type":"proposal"'));
            // Verify signature presence
            (0, globals_1.expect)(mockPublish).toHaveBeenCalledWith('swarm:consensus', globals_1.expect.stringContaining('"signature":'));
        });
    });
    (0, globals_1.describe)('SwarmIntelligenceService', () => {
        (0, globals_1.it)('should return a singleton instance', () => {
            const instance1 = SwarmIntelligenceService_js_1.SwarmIntelligenceService.getInstance();
            const instance2 = SwarmIntelligenceService_js_1.SwarmIntelligenceService.getInstance();
            (0, globals_1.expect)(instance1).toBe(instance2);
        });
    });
});
