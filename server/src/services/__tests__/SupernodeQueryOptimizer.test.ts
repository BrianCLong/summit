
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Create mocks at the top level so they can be referenced in the mock module
const mockSession = {
  run: jest.fn(),
  close: jest.fn(),
};
const mockDriver = {
  session: jest.fn(),
};

// Mock neo4j-driver
jest.unstable_mockModule('neo4j-driver', () => ({
  default: {
    driver: jest.fn(() => mockDriver),
    auth: {
      basic: jest.fn(),
    },
  },
  Driver: jest.fn(),
  Session: jest.fn(),
}));

// Mock ioredis
jest.unstable_mockModule('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    keys: jest.fn(),
    del: jest.fn(),
  })),
}));

// Mock logger
jest.unstable_mockModule('../utils/logger.js', () => ({
  __esModule: true,
  default: {
    child: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    })),
  },
}));

const { SupernodeQueryOptimizer } = await import('../SupernodeQueryOptimizer.js');

describe('SupernodeQueryOptimizer', () => {
  let optimizer: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock behavior
    (mockDriver.session as jest.Mock).mockReturnValue(mockSession);
    (mockSession.run as jest.Mock).mockResolvedValue({ records: [] });
    (mockSession.close as jest.Mock).mockResolvedValue(undefined);

    optimizer = new SupernodeQueryOptimizer(mockDriver as any, undefined, {
      supernodeThreshold: 100,
    });
    // Reset internal cache
    optimizer['supernodeCache'].clear();
  });

  describe('getSupernodeInfo', () => {
    it('should use size() for degree checks and return info', async () => {
      const mockRecord = {
        get: (key: string) => {
          const data: any = {
            entityId: 'ent-1',
            label: 'Entity 1',
            type: 'Person',
            connectionCount: { toNumber: () => 150 },
            outgoing: { toNumber: () => 100 },
            incoming: { toNumber: () => 50 },
            topTypes: [{ type: 'KNOWS', count: 150 }],
          };
          return data[key];
        },
      };

      (mockSession.run as jest.Mock).mockResolvedValue({
        records: [mockRecord],
      });

      const info = await optimizer.getSupernodeInfo('ent-1');

      expect(info).toBeDefined();
      expect(info.connectionCount).toBe(150);
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('size((e)-->())'),
        { entityId: 'ent-1' }
      );
    });
  });

  describe('detectSupernodes', () => {
    it('should batch multiple IDs using UNWIND', async () => {
      const mockRecords = [
        {
          get: (key: string) => {
            const data: any = {
              entityId: 'ent-1',
              label: 'Entity 1',
              type: 'Person',
              connectionCount: { toNumber: () => 200 },
              outgoing: { toNumber: () => 100 },
              incoming: { toNumber: () => 100 },
              topTypes: [],
            };
            return data[key];
          },
        },
        {
          get: (key: string) => {
            const data: any = {
              entityId: 'ent-2',
              label: 'Entity 2',
              type: 'Person',
              connectionCount: { toNumber: () => 300 },
              outgoing: { toNumber: () => 150 },
              incoming: { toNumber: () => 150 },
              topTypes: [],
            };
            return data[key];
          },
        },
      ];

      (mockSession.run as jest.Mock).mockResolvedValue({
        records: mockRecords,
      });

      const ids = ['ent-1', 'ent-2', 'ent-3'];
      const supernodes = await optimizer.detectSupernodes(ids);

      expect(supernodes).toHaveLength(2);
      expect(mockSession.run).toHaveBeenCalledTimes(1); // Only one call for all IDs
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('UNWIND $entityIds'),
        expect.objectContaining({ entityIds: ['ent-1', 'ent-2', 'ent-3'] })
      );
    });

    it('should use cache and only query missing IDs', async () => {
       // Pre-fill cache
       const cachedInfo = {
           entityId: 'ent-cached',
           connectionCount: 500,
           label: 'Cached',
           type: 'Person',
           incomingCount: 250,
           outgoingCount: 250,
           topConnectionTypes: [],
           lastUpdated: new Date()
       };
       optimizer['supernodeCache'].set('ent-cached', cachedInfo);

       (mockSession.run as jest.Mock).mockResolvedValue({ records: [] });

       await optimizer.detectSupernodes(['ent-cached', 'ent-new']);

       expect(mockSession.run).toHaveBeenCalledWith(
           expect.any(String),
           expect.objectContaining({ entityIds: ['ent-new'] })
       );
    });
  });

  describe('precomputeSupernodeStats', () => {
    it('should use batched detection', async () => {
        (mockSession.run as jest.Mock).mockResolvedValueOnce({
            records: [
                { get: () => 'ent-1' },
                { get: () => 'ent-2' }
            ]
        });

        // Mock detectSupernodes call that happens inside
        const detectSpy = jest.spyOn(optimizer, 'detectSupernodes').mockResolvedValue([
            { entityId: 'ent-1', connectionCount: 200 } as any,
            { entityId: 'ent-2', connectionCount: 300 } as any
        ]);

        const processed = await optimizer.precomputeSupernodeStats(10);

        expect(processed).toBe(2);
        expect(detectSpy).toHaveBeenCalledWith(['ent-1', 'ent-2']);
    });
  });
});
