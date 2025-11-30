import { SigIntManager } from '../../src/sigint/SigIntManager.js';
import { SigIntRepository } from '../../src/sigint/persistence/SigIntRepository.js';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock DB Repository to avoid real DB calls
jest.mock('../../src/sigint/persistence/SigIntRepository.js');

// Mock neo4j-driver to avoid compilation/runtime issues in CI environment
jest.mock('neo4j-driver', () => ({
    driver: () => ({
        verifyConnectivity: jest.fn(),
        session: () => ({
            run: jest.fn(),
            close: jest.fn()
        }),
        close: jest.fn()
    }),
    auth: { basic: jest.fn() }
}), { virtual: true });

// Mock modules causing issues with types/execution
jest.mock('../../src/db/neo4j.js', () => ({
  getNeo4jDriver: jest.fn(),
}));

jest.mock('../../src/lib/telemetry/comprehensive-telemetry.js', () => ({
    telemetry: {
        subsystems: {
            database: {
                queries: { add: jest.fn() },
                errors: { add: jest.fn() },
                latency: { record: jest.fn() }
            },
            sigint: {
                signalsIngested: { add: jest.fn() },
                jammingEvents: { add: jest.fn() },
                decryptions: { add: jest.fn() }
            }
        },
        recordLatency: jest.fn(),
        recordRequest: jest.fn()
    }
}));


describe('SIGINT Platform (System Tests)', () => {
  let manager: SigIntManager;
  let mockRepo: jest.Mocked<SigIntRepository>;

  beforeEach(() => {
    // Reset singleton if possible or re-instantiate mocks
    mockRepo = {
        getAllEmitters: jest.fn<any>().mockResolvedValue([]),
        getRecentSignals: jest.fn<any>().mockResolvedValue([]),
        getSignalsByEmitter: jest.fn<any>().mockResolvedValue([]),
        getEmitter: jest.fn<any>().mockResolvedValue(null),
        upsertEmitter: jest.fn<any>().mockResolvedValue(undefined),
        logSignal: jest.fn<any>().mockResolvedValue(undefined),
    } as any;

    (SigIntRepository.getInstance as jest.Mock).mockReturnValue(mockRepo);

    // Force reset of Manager singleton for testing
    // @ts-ignore
    SigIntManager.instance = undefined;
    manager = SigIntManager.getInstance();
  });

  describe('Full Pipeline Processing', () => {
    it('should ingest, classify, persist, and emit metrics', async () => {
      const input = {
        frequency: 9400e6, // X-Band
        bandwidth: 5e6,
        power: -45,
        duration: 20
      };

      const processed = await manager.processSignalEvent(input);

      // Verification
      expect(processed.classification?.label).toContain('X-Band');

      // Persistence Checks
      expect(mockRepo.logSignal).toHaveBeenCalledTimes(1);
      expect(mockRepo.upsertEmitter).toHaveBeenCalledTimes(1);

      const loggedSignal = (mockRepo.logSignal as jest.Mock).mock.calls[0][0] as any;
      expect(loggedSignal.classification.threatLevel).toBe('CRITICAL');
    });

    it('should detect jamming using repository history', async () => {
        // Mock recent history containing wideband high power signals
        const jammingHistory = [{
            id: 'jam-1',
            timestamp: new Date(),
            frequency: 100e6,
            bandwidth: 60e6,
            power: -10,
            duration: 1000
        }];
        mockRepo.getRecentSignals.mockResolvedValue(jammingHistory as any);

        const input = {
            frequency: 110e6,
            bandwidth: 1e6,
            power: -80
        };

        const processed = await manager.processSignalEvent(input);

        expect(processed.metadata?.jamming).toBeDefined();
        expect(processed.metadata?.jamming.isJammed).toBe(true);
        expect(mockRepo.getRecentSignals).toHaveBeenCalled();
    });

    it('should correlate frequency hopping via emitter history', async () => {
        const emitterId = 'hopper-1';

        // Mock history for this emitter
        const history = [
            { id: 'h1', emitterId, frequency: 2400e6, timestamp: new Date() },
            { id: 'h2', emitterId, frequency: 2420e6, timestamp: new Date() },
            { id: 'h3', emitterId, frequency: 2440e6, timestamp: new Date() },
            { id: 'h4', emitterId, frequency: 2460e6, timestamp: new Date() },
            { id: 'h5', emitterId, frequency: 2480e6, timestamp: new Date() }
        ];
        mockRepo.getSignalsByEmitter.mockResolvedValue(history as any);

        const input = {
            emitterId: emitterId,
            frequency: 2500e6,
            bandwidth: 1e6,
            power: -50
        };

        const processed = await manager.processSignalEvent(input);

        expect(processed.metadata?.frequencyHopping).toBeDefined();
        expect(processed.metadata?.frequencyHopping.isHopping).toBe(true);
        expect(mockRepo.getSignalsByEmitter).toHaveBeenCalledWith(emitterId, 20);
    });
  });
});
