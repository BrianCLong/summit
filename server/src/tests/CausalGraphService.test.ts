import { CausalGraphService } from '../services/CausalGraphService';

// Mock Neo4j driver and session
const mockRun = jest.fn();
const mockClose = jest.fn();
const mockSession = jest.fn(() => ({
  run: mockRun,
  close: mockClose,
}));

jest.mock('../config/database', () => ({
  getNeo4jDriver: jest.fn(() => ({
    session: mockSession,
  })),
}));

describe('CausalGraphService', () => {
  let service: CausalGraphService;

  beforeEach(() => {
    // Reset the mock return value before creating the service
    // The service constructor calls getNeo4jDriver()
    mockSession.mockReturnValue({
        run: mockRun,
        close: mockClose,
    });
    (require('../config/database').getNeo4jDriver as jest.Mock).mockReturnValue({
        session: mockSession,
    });
    service = new CausalGraphService();
    mockRun.mockClear();
    mockClose.mockClear();
  });

  it('should generate a causal graph with explicit causal relationships', async () => {
    // Mock data
    const nodesMock = {
      records: [
        {
          get: (key: string) => {
            const data: any = {
              id: 'event1',
              label: 'Event 1',
              types: ['Event'],
              date: '2023-01-01T10:00:00Z',
            };
            return data[key] !== undefined ? data[key] : (key === 'types' ? ['Event'] : null);
          },
        },
        {
          get: (key: string) => {
            const data: any = {
              id: 'event2',
              label: 'Event 2',
              types: ['Event'],
              date: '2023-01-01T11:00:00Z',
            };
            return data[key] !== undefined ? data[key] : (key === 'types' ? ['Event'] : null);
          },
        },
      ],
    };

    const edgesMock = {
      records: [
        {
          get: (key: string) => {
            const data: any = {
              source: 'event1',
              target: 'event2',
              type: 'CAUSED',
            };
            return data[key];
          },
        },
      ],
    };

    mockRun
      .mockResolvedValueOnce(nodesMock) // First call for nodes
      .mockResolvedValueOnce(edgesMock); // Second call for edges

    const result = await service.generateCausalGraph('inv1');

    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].type).toBe('INFLUENCED');
    expect(result.edges[0].weight).toBeGreaterThan(0.9); // Explicit CAUSED + temporal precedence
    expect(result.edges[0].evidence).toContain('Explicit relationship');
    expect(result.edges[0].evidence).toContain('Temporal precedence');
  });

  it('should infer causality from temporal precedence on weak links', async () => {
    // Mock data
    const nodesMock = {
      records: [
        {
          get: (key: string) => {
            const data: any = {
              id: 'event1',
              label: 'Event 1',
              types: ['Event'],
              date: '2023-01-01T10:00:00Z',
            };
            return data[key] !== undefined ? data[key] : (key === 'types' ? ['Event'] : null);
          },
        },
        {
          get: (key: string) => {
            const data: any = {
              id: 'event2',
              label: 'Event 2',
              types: ['Event'],
              date: '2023-01-01T11:00:00Z',
            };
            return data[key] !== undefined ? data[key] : (key === 'types' ? ['Event'] : null);
          },
        },
      ],
    };

    const edgesMock = {
      records: [
        {
          get: (key: string) => {
            const data: any = {
              source: 'event1',
              target: 'event2',
              type: 'RELATED_TO',
            };
            return data[key];
          },
        },
      ],
    };

    mockRun
      .mockResolvedValueOnce(nodesMock)
      .mockResolvedValueOnce(edgesMock);

    const result = await service.generateCausalGraph('inv1');

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].weight).toBeGreaterThan(0.4);
    expect(result.edges[0].evidence).toContain('Temporal precedence');
  });
});
