import { PredictiveService } from '../PredictiveService';
import { getNeo4jDriver } from '../../config/database';
import { WhatIfRequest } from '../../contracts/predictive/types';

// Mock getNeo4jDriver
jest.mock('../../config/database', () => ({
  getNeo4jDriver: jest.fn(),
}));

describe('PredictiveService Integration (Mocked Driver)', () => {
    let mockSession: any;
    let mockRun: jest.Mock;
    let service: PredictiveService;

    beforeEach(() => {
        mockRun = jest.fn();
        mockSession = {
            run: mockRun,
            close: jest.fn(),
        };

        (getNeo4jDriver as jest.Mock).mockReturnValue({
            session: jest.fn().mockReturnValue(mockSession)
        });

        service = new PredictiveService();
    });

    it('correctly reconstructs edges from GraphStore convention', async () => {
        // Setup mock response with properties-based edges
        mockRun.mockResolvedValue({
            records: [
                {
                    get: (key: string) => {
                        if (key === 'n') return { properties: { id: 'node1' }, labels: ['Person'], elementId: 'n1' };
                        if (key === 'm') return { properties: { id: 'node2' }, labels: ['Person'], elementId: 'n2' };
                        if (key === 'r') return {
                            properties: { id: 'edge1', fromId: 'node1', toId: 'node2' },
                            type: 'KNOWS',
                            startNodeElementId: 'n1',
                            endNodeElementId: 'n2'
                        };
                    }
                }
            ]
        });

        const req: WhatIfRequest = {
            investigationId: 'inv1',
            injectedNodes: [],
            injectedEdges: [],
            legalBasis: { purpose: 'test', policyId: 'p1' }
        };

        const result = await service.simulateWhatIf(req);

        // Base metric avgDegree should be 1/2 = 0.5 (1 edge, 2 nodes).
        // My SimpleGraph treats density/centrality.
        // SimpleGraph edges: [{ source: 'node1', target: 'node2' }]
        // 2 nodes. 1 edge.
        // Density: 1 / (2*1) = 0.5.

        expect(result.baselineMetrics.density).toBeCloseTo(0.5);
    });

    it('correctly reconstructs edges from Internal IDs fallback', async () => {
        // Setup mock response without properties but with internal ID match
        mockRun.mockResolvedValue({
            records: [
                {
                    get: (key: string) => {
                        if (key === 'n') return { properties: { id: 'nodeA' }, labels: ['Person'], elementId: 'intA', identity: 'intA' };
                        if (key === 'm') return { properties: { id: 'nodeB' }, labels: ['Person'], elementId: 'intB', identity: 'intB' };
                        if (key === 'r') return {
                            properties: { id: 'edgeX' }, // Missing fromId/toId
                            type: 'KNOWS',
                            startNodeElementId: 'intA', // Matches nodeA
                            endNodeElementId: 'intB',   // Matches nodeB
                            start: 'intA',
                            end: 'intB'
                        };
                    }
                }
            ]
        });

        const req: WhatIfRequest = {
            investigationId: 'inv2',
            injectedNodes: [],
            injectedEdges: [],
            legalBasis: { purpose: 'test', policyId: 'p1' }
        };

        const result = await service.simulateWhatIf(req);

        // Should successfully link nodeA -> nodeB
        expect(result.baselineMetrics.density).toBeCloseTo(0.5);
    });
});
