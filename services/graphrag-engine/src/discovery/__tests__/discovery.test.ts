import { jest } from '@jest/globals';
import { DiscoveryRetriever } from '../DiscoveryRetriever.js';
import { Driver, Session } from 'neo4j-driver';

describe('DiscoveryRetriever', () => {
  let mockDriver: jest.Mocked<Driver>;
  let mockSession: jest.Mocked<Session>;

  beforeEach(() => {
    mockSession = {
      run: jest.fn(),
      close: jest.fn(),
    } as any;
    mockDriver = {
      session: jest.fn(() => mockSession),
    } as any;
  });

  test('should return candidates within budget', async () => {
    const retriever = new DiscoveryRetriever(mockDriver);
    const mockRecords = [
      {
        get: (key: string) => {
          if (key === 'entityId') return 'e1';
          if (key === 'pathNodes') return [{}, {}];
          return null;
        }
      }
    ];

    (mockSession.run as any).mockResolvedValue({
      records: mockRecords
    } as any);

    const result = await retriever.discover('test query', ['seed1'], {
      maxHops: 2,
      maxCandidates: 10,
      timeoutMs: 1000
    });

    expect(result.candidates.length).toBe(1);
    expect(result.metadata.hopsReached).toBe(2);
    expect(mockSession.run).toHaveBeenCalledWith(
      expect.stringContaining('MATCH path = (n)-[*1..2]-(m:Entity)'),
      expect.any(Object)
    );
  });
});
