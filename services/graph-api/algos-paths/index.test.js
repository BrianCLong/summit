"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
describe('Pathfinding Suite', () => {
    const edges = [
        {
            from: 'A',
            to: 'B',
            weight: 1,
            policy: 'allow',
            territory: 'US',
            time: 1,
        },
        {
            from: 'B',
            to: 'C',
            weight: 1,
            policy: 'allow',
            territory: 'US',
            time: 2,
        },
        { from: 'A', to: 'C', weight: 5, policy: 'deny', territory: 'EU', time: 3 },
        {
            from: 'C',
            to: 'D',
            weight: 1,
            policy: 'allow',
            territory: 'US',
            time: 4,
        },
        {
            from: 'B',
            to: 'D',
            weight: 2,
            policy: 'allow',
            territory: 'US',
            time: 5,
        },
    ];
    test('finds shortest path', () => {
        const path = (0, index_1.shortestPath)(edges, 'A', 'D');
        expect(path).toEqual(['A', 'B', 'D']);
    });
    test('respects constraints', () => {
        const path = (0, index_1.constrainedPaths)(edges, 'A', 'D', {
            policies: ['allow'],
            territories: ['US'],
            timeWindow: [0, 4],
        });
        expect(path).toEqual(['A', 'B', 'C', 'D']);
    });
    test('computes k shortest paths', () => {
        const paths = (0, index_1.kShortestPaths)(edges, 'A', 'D', 2);
        expect(paths[0]).toEqual(['A', 'B', 'D']);
        expect(paths[1]).toEqual(['A', 'B', 'C', 'D']);
    });
});
