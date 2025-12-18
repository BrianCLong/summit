import { CognitiveMapperService } from '../CognitiveMapperService';
import { getNeo4jDriver } from '../../config/database';
import { Driver, Session, Result } from 'neo4j-driver';

// Helper to define Record type since it's hard to import
interface Neo4jRecord {
  keys: string[];
  length: number;
  get: (key: string) => any;
  toObject: () => any;
}

// Mock getNeo4jDriver
jest.mock('../../config/database', () => ({
  getNeo4jDriver: jest.fn()
}));

// Helper to mock Neo4j record
const mockRecord = (keys: string[], values: any[]): Neo4jRecord => {
  return {
    keys,
    length: keys.length,
    get: (key: string) => {
      const index = keys.indexOf(key);
      if (index === -1) return null;
      const val = values[index];

      // Only mock Neo4j integer behavior for specific fields expected to be Integers
      if (['hops', 'degree', 'reach', 'pathCount'].includes(key)) {
         return {
          toNumber: () => val,
          toInt: () => val
        };
      }
      return val;
    },
    toObject: () => {
      const obj: any = {};
      keys.forEach((k, i) => obj[k] = values[i]);
      return obj;
    }
  };
};

describe('CognitiveMapperService', () => {
  let mockDriver: jest.Mocked<Driver>;
  let mockSession: jest.Mocked<Session>;

  beforeEach(() => {
    mockSession = {
      run: jest.fn(),
      close: jest.fn(),
      beginTransaction: jest.fn(),
      lastBookmark: jest.fn(),
    } as unknown as jest.Mocked<Session>;

    mockDriver = {
      session: jest.fn().mockReturnValue(mockSession),
      close: jest.fn(),
    } as unknown as jest.Mocked<Driver>;

    (getNeo4jDriver as jest.Mock).mockReturnValue(mockDriver);

    // Reset singleton instance to ensure new mock driver is used
    // @ts-ignore
    CognitiveMapperService.instance = undefined;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('simulatePropagation', () => {
    it('should simulate propagation and return influence map', async () => {
      const service = CognitiveMapperService.getInstance();

      const mockResult = {
        records: [
          mockRecord(['nodeId', 'label', 'hops', 'finalStrength'], ['node1', 'User', 1, 0.8]),
          mockRecord(['nodeId', 'label', 'hops', 'finalStrength'], ['node2', 'Group', 2, 0.64])
        ]
      };

      (mockSession.run as jest.Mock).mockResolvedValue(mockResult);

      const result = await service.simulatePropagation('startNode', 1.0, 3);

      expect(result.nodesReached).toBe(2);
      expect(result.maxDepth).toBe(2);
      expect(result.influenceMap['node1']).toBe(0.8);
      expect(result.influenceMap['node2']).toBe(0.64);
      expect(mockSession.run).toHaveBeenCalledTimes(1);
    });
  });

  describe('detectAmplifiers', () => {
    it('should identify amplifier nodes', async () => {
      const service = CognitiveMapperService.getInstance();

      const mockResult = {
        records: [
          mockRecord(
            ['nodeId', 'label', 'degree', 'reach', 'amplificationScore'],
            ['amp1', 'User', 10, 50, 35]
          )
        ]
      };

      (mockSession.run as jest.Mock).mockResolvedValue(mockResult);

      const result = await service.detectAmplifiers('inv123');

      expect(result).toHaveLength(1);
      expect(result[0].nodeId).toBe('amp1');
      expect(result[0].amplificationScore).toBe(35);
    });
  });

  describe('forecastOpinionShift', () => {
    it('should forecast opinion shift based on neighbors', async () => {
      const service = CognitiveMapperService.getInstance();

      // Mock node has 0.5 opinion, neighbors have -0.5 and -0.3
      const mockResult = {
        records: [
          mockRecord(
            ['selfOpinion', 'neighborOpinions'],
            [0.5, [-0.5, -0.3]] // Avg neighbor = -0.4
          )
        ]
      };

      (mockSession.run as jest.Mock).mockResolvedValue(mockResult);

      // t=1: 0.5 * 0.7 + (-0.4) * 0.3 = 0.35 - 0.12 = 0.23
      const result = await service.forecastOpinionShift('nodeX', 1);

      expect(result.nodeId).toBe('nodeX');
      expect(result.predictedOpinion).toBeCloseTo(0.23);
    });
  });
});
