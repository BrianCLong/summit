import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { WhatIfRequest } from '../../contracts/predictive/types.js';

const getNeo4jDriverMock = jest.fn();

jest.unstable_mockModule('../../config/database.js', () => ({
  getNeo4jDriver: getNeo4jDriverMock,
}));

describe('PredictiveService Integration (Mocked Driver)', () => {
  let PredictiveService: any;
  let mockSession: { run: jest.Mock; close: jest.Mock };
  let mockRun: jest.Mock;
  let service: any;

  beforeAll(async () => {
    const module = await import('../PredictiveService.js');
    PredictiveService = module.PredictiveService;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockRun = jest.fn();
    mockSession = {
      run: mockRun,
      close: jest.fn(),
    };

    getNeo4jDriverMock.mockReturnValue({
      session: jest.fn().mockReturnValue(mockSession),
    });

    service = new PredictiveService();
  });

  it('correctly reconstructs edges from GraphStore convention', async () => {
    mockRun.mockResolvedValue({
      records: [
        {
          get: (key: string) => {
            if (key === 'n') {
              return { properties: { id: 'node1' }, labels: ['Person'], elementId: 'n1' };
            }
            if (key === 'm') {
              return { properties: { id: 'node2' }, labels: ['Person'], elementId: 'n2' };
            }
            if (key === 'r') {
              return {
                properties: { id: 'edge1', fromId: 'node1', toId: 'node2' },
                type: 'KNOWS',
                startNodeElementId: 'n1',
                endNodeElementId: 'n2',
              };
            }
            return undefined;
          },
        },
      ],
    });

    const req: WhatIfRequest = {
      investigationId: 'inv1',
      injectedNodes: [],
      injectedEdges: [],
      legalBasis: { purpose: 'test', policyId: 'p1' },
    };

    const result = await service.simulateWhatIf(req);

    expect(result.baselineMetrics.density).toBeCloseTo(0.5);
  });

  it('correctly reconstructs edges from Internal IDs fallback', async () => {
    mockRun.mockResolvedValue({
      records: [
        {
          get: (key: string) => {
            if (key === 'n') {
              return {
                properties: { id: 'nodeA' },
                labels: ['Person'],
                elementId: 'intA',
                identity: 'intA',
              };
            }
            if (key === 'm') {
              return {
                properties: { id: 'nodeB' },
                labels: ['Person'],
                elementId: 'intB',
                identity: 'intB',
              };
            }
            if (key === 'r') {
              return {
                properties: { id: 'edgeX' },
                type: 'KNOWS',
                startNodeElementId: 'intA',
                endNodeElementId: 'intB',
                start: 'intA',
                end: 'intB',
              };
            }
            return undefined;
          },
        },
      ],
    });

    const req: WhatIfRequest = {
      investigationId: 'inv2',
      injectedNodes: [],
      injectedEdges: [],
      legalBasis: { purpose: 'test', policyId: 'p1' },
    };

    const result = await service.simulateWhatIf(req);

    expect(result.baselineMetrics.density).toBeCloseTo(0.5);
  });
});
