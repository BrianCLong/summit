import { SimpleGraphEngine } from '../SimpleGraph';
import { GraphSnapshot } from '../../contracts/predictive/types';

describe('SimpleGraphEngine', () => {
    const mockSnapshot: GraphSnapshot = {
        metadata: { timestamp: Date.now() },
        nodes: [
            { id: '1', label: 'Person', properties: {} },
            { id: '2', label: 'Person', properties: {} },
            { id: '3', label: 'Person', properties: {} }
        ],
        edges: [
            { id: 'e1', source: '1', target: '2', type: 'KNOWS', properties: {} },
            { id: 'e2', source: '2', target: '3', type: 'KNOWS', properties: {} }
        ]
    };

    it('calculates metrics correctly', () => {
        const engine = new SimpleGraphEngine(mockSnapshot);
        const metrics = engine.getMetrics();

        expect(metrics.density).toBeCloseTo(2 / (3 * 2)); // 2 edges, 3 nodes => 6 possible
        expect(metrics.avgDegree).toBeCloseTo(2 / 3);
        expect(metrics.communities).toBe(1); // All connected
    });

    it('calculates centrality correctly', () => {
        const engine = new SimpleGraphEngine(mockSnapshot);
        const metrics = engine.getMetrics();

        // Node 2 has 2 connections (1 incoming, 1 outgoing), others have 1
        // My simple implementation sums them up.
        // Node 1: 1 edge (source)
        // Node 2: 2 edges (target of 1, source of 2)
        // Node 3: 1 edge (target)

        expect(metrics.centrality['2']).toBeGreaterThan(metrics.centrality['1']);
        expect(metrics.centrality['2']).toBeGreaterThan(metrics.centrality['3']);
    });

    it('handles disconnected components', () => {
        const disconnectedSnapshot = {
            ...mockSnapshot,
            nodes: [...mockSnapshot.nodes, { id: '4', label: 'Loner', properties: {} }]
        };
        const engine = new SimpleGraphEngine(disconnectedSnapshot);
        const metrics = engine.getMetrics();

        expect(metrics.communities).toBe(2);
    });
});
