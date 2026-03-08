"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SigIntManager_js_1 = require("../../src/sigint/SigIntManager.js");
const SigIntRepository_js_1 = require("../../src/sigint/persistence/SigIntRepository.js");
const globals_1 = require("@jest/globals");
// Mock DB Repository to avoid real DB calls
globals_1.jest.mock('../../src/sigint/persistence/SigIntRepository.js');
// Mock neo4j-driver to avoid compilation/runtime issues in CI environment
globals_1.jest.mock('neo4j-driver', () => ({
    driver: () => ({
        verifyConnectivity: globals_1.jest.fn(),
        session: () => ({
            run: globals_1.jest.fn(),
            close: globals_1.jest.fn()
        }),
        close: globals_1.jest.fn()
    }),
    auth: { basic: globals_1.jest.fn() }
}), { virtual: true });
// Mock modules causing issues with types/execution
globals_1.jest.mock('../../src/db/neo4j.js', () => ({
    getNeo4jDriver: globals_1.jest.fn(),
}));
globals_1.jest.mock('../../src/lib/telemetry/comprehensive-telemetry.js', () => ({
    telemetry: {
        subsystems: {
            database: {
                queries: { add: globals_1.jest.fn() },
                errors: { add: globals_1.jest.fn() },
                latency: { record: globals_1.jest.fn() }
            },
            sigint: {
                signalsIngested: { add: globals_1.jest.fn() },
                jammingEvents: { add: globals_1.jest.fn() },
                decryptions: { add: globals_1.jest.fn() }
            }
        },
        recordLatency: globals_1.jest.fn(),
        recordRequest: globals_1.jest.fn()
    }
}));
(0, globals_1.describe)('SIGINT Platform (System Tests)', () => {
    let manager;
    let mockRepo;
    (0, globals_1.beforeEach)(() => {
        // Reset singleton if possible or re-instantiate mocks
        mockRepo = {
            getAllEmitters: globals_1.jest.fn().mockResolvedValue([]),
            getRecentSignals: globals_1.jest.fn().mockResolvedValue([]),
            getSignalsByEmitter: globals_1.jest.fn().mockResolvedValue([]),
            getEmitter: globals_1.jest.fn().mockResolvedValue(null),
            upsertEmitter: globals_1.jest.fn().mockResolvedValue(undefined),
            logSignal: globals_1.jest.fn().mockResolvedValue(undefined),
        };
        SigIntRepository_js_1.SigIntRepository.getInstance.mockReturnValue(mockRepo);
        // Force reset of Manager singleton for testing
        // @ts-ignore
        SigIntManager_js_1.SigIntManager.instance = undefined;
        manager = SigIntManager_js_1.SigIntManager.getInstance();
    });
    (0, globals_1.describe)('Full Pipeline Processing', () => {
        (0, globals_1.it)('should ingest, classify, persist, and emit metrics', async () => {
            const input = {
                frequency: 9400e6, // X-Band
                bandwidth: 5e6,
                power: -45,
                duration: 20
            };
            const processed = await manager.processSignalEvent(input);
            // Verification
            (0, globals_1.expect)(processed.classification?.label).toContain('X-Band');
            // Persistence Checks
            (0, globals_1.expect)(mockRepo.logSignal).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(mockRepo.upsertEmitter).toHaveBeenCalledTimes(1);
            const loggedSignal = mockRepo.logSignal.mock.calls[0][0];
            (0, globals_1.expect)(loggedSignal.classification.threatLevel).toBe('CRITICAL');
        });
        (0, globals_1.it)('should detect jamming using repository history', async () => {
            // Mock recent history containing wideband high power signals
            const jammingHistory = [{
                    id: 'jam-1',
                    timestamp: new Date(),
                    frequency: 100e6,
                    bandwidth: 60e6,
                    power: -10,
                    duration: 1000
                }];
            mockRepo.getRecentSignals.mockResolvedValue(jammingHistory);
            const input = {
                frequency: 110e6,
                bandwidth: 1e6,
                power: -80
            };
            const processed = await manager.processSignalEvent(input);
            (0, globals_1.expect)(processed.metadata?.jamming).toBeDefined();
            (0, globals_1.expect)(processed.metadata?.jamming.isJammed).toBe(true);
            (0, globals_1.expect)(mockRepo.getRecentSignals).toHaveBeenCalled();
        });
        (0, globals_1.it)('should correlate frequency hopping via emitter history', async () => {
            const emitterId = 'hopper-1';
            // Mock history for this emitter
            const history = [
                { id: 'h1', emitterId, frequency: 2400e6, timestamp: new Date() },
                { id: 'h2', emitterId, frequency: 2420e6, timestamp: new Date() },
                { id: 'h3', emitterId, frequency: 2440e6, timestamp: new Date() },
                { id: 'h4', emitterId, frequency: 2460e6, timestamp: new Date() },
                { id: 'h5', emitterId, frequency: 2480e6, timestamp: new Date() }
            ];
            mockRepo.getSignalsByEmitter.mockResolvedValue(history);
            const input = {
                emitterId: emitterId,
                frequency: 2500e6,
                bandwidth: 1e6,
                power: -50
            };
            const processed = await manager.processSignalEvent(input);
            (0, globals_1.expect)(processed.metadata?.frequencyHopping).toBeDefined();
            (0, globals_1.expect)(processed.metadata?.frequencyHopping.isHopping).toBe(true);
            (0, globals_1.expect)(mockRepo.getSignalsByEmitter).toHaveBeenCalledWith(emitterId, 20);
        });
    });
});
