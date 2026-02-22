import { jest } from '@jest/globals';
import { JustificationEvidenceAPI } from '../JustificationEvidenceAPI.js';
import { Driver, Session } from 'neo4j-driver';
import { QueryRegistry, Phase } from '@summit/graphrag-core';

describe('JustificationEvidenceAPI', () => {
  let mockDriver: jest.Mocked<Driver>;
  let mockSession: jest.Mocked<Session>;
  const mockRegistry: QueryRegistry = {
    queries: [
      {
        id: 'q1',
        phase: Phase.JUSTIFICATION,
        cypher: 'MATCH (n) RETURN n',
        max_rows: 5,
        projection_allowlist: ['n'],
        tenant_scope: true
      }
    ]
  };

  beforeEach(() => {
    mockSession = {
      run: jest.fn(),
      close: jest.fn(),
    } as any;
    mockDriver = {
      session: jest.fn(() => mockSession),
    } as any;
  });

  test('should fetch proof using registered query', async () => {
    const api = new JustificationEvidenceAPI(mockDriver, mockRegistry);
    (mockSession.run as any).mockResolvedValue({
      records: []
    } as any);

    const result = await api.fetchProof('q1', { id: 'test' });
    expect(result.nodes).toEqual([]);
    expect(mockSession.run).toHaveBeenCalledWith('MATCH (n) RETURN n', { id: 'test' });
  });

  test('should throw if query is not in JUSTIFICATION phase', async () => {
    const discoveryRegistry: QueryRegistry = {
      queries: [
        {
          id: 'q2',
          phase: Phase.DISCOVERY,
          cypher: 'MATCH (n) RETURN n',
          tenant_scope: true
        }
      ]
    };
    const api = new JustificationEvidenceAPI(mockDriver, discoveryRegistry);
    await expect(api.fetchProof('q2', {})).rejects.toThrow('not a JUSTIFICATION query');
  });
});
