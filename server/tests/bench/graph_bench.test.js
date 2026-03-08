"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const GraphAnalyticsService_1 = require("../../src/services/GraphAnalyticsService");
const mockGetDriver = globals_1.jest.fn(() => ({
    session: () => ({
        run: async () => ({
            records: [
                {
                    get: (key) => {
                        if (key === 'p') {
                            return {
                                length: 1,
                                segments: [
                                    {
                                        start: { properties: { id: '1' } },
                                        end: { properties: { id: '2' } },
                                        relationship: { type: 'RELATED', properties: { id: 'r1' } },
                                    },
                                ],
                            };
                        }
                        return null;
                    },
                },
            ],
        }),
        close: async () => { },
    }),
}));
const mockRunCypher = globals_1.jest.fn(async () => [
    {
        nodes: [{ id: '1', labels: ['Entity'], properties: {} }],
        edges: [
            {
                id: 'e1',
                type: 'RELATED',
                properties: {},
                fromEntityId: '1',
                toEntityId: '2',
            },
        ],
    },
]);
(0, globals_1.describe)('Graph Analytics Benchmark', () => {
    let service;
    beforeEach(() => {
        console.log('Setup: Getting instance');
        GraphAnalyticsService_1.Neo4jGraphAnalyticsService.instance = undefined;
        service = GraphAnalyticsService_1.Neo4jGraphAnalyticsService.getInstance();
        mockGetDriver.mockImplementation(() => ({
            session: () => ({
                run: async () => ({
                    records: [
                        {
                            get: (key) => {
                                if (key === 'p') {
                                    return {
                                        length: 1,
                                        segments: [
                                            {
                                                start: { properties: { id: '1' } },
                                                end: { properties: { id: '2' } },
                                                relationship: { type: 'RELATED', properties: { id: 'r1' } },
                                            },
                                        ],
                                    };
                                }
                                return null;
                            },
                        },
                    ],
                }),
                close: async () => { },
            }),
        }));
        mockRunCypher.mockImplementation(async () => [
            {
                nodes: [{ id: '1', labels: ['Entity'], properties: {} }],
                edges: [
                    {
                        id: 'e1',
                        type: 'RELATED',
                        properties: {},
                        fromEntityId: '1',
                        toEntityId: '2',
                    },
                ],
            },
        ]);
        service.deps.getDriver = mockGetDriver;
        service.deps.runCypher = mockRunCypher;
    });
    (0, globals_1.it)('Benchmarking shortestPath and kHopNeighborhood', async () => {
        const iterations = 10; // Reduced for safety
        // Benchmark shortestPath
        console.log('Starting shortestPath benchmark...');
        const startShortest = Date.now();
        for (let i = 0; i < iterations; i++) {
            await service.shortestPath({
                tenantId: 'tenant-1',
                from: '1',
                to: '2'
            });
        }
        const endShortest = Date.now();
        const durationShortest = endShortest - startShortest;
        const rpsShortest = (iterations / durationShortest) * 1000;
        // Benchmark kHopNeighborhood
        console.log('Starting kHopNeighborhood benchmark...');
        const startKHop = Date.now();
        for (let i = 0; i < iterations; i++) {
            await service.kHopNeighborhood({
                tenantId: 'tenant-1',
                seedIds: ['1'],
                depth: 2
            });
        }
        const endKHop = Date.now();
        const durationKHop = endKHop - startKHop;
        const rpsKHop = (iterations / durationKHop) * 1000;
        console.log(`\n=== BENCHMARK RESULTS (Baseline) ===`);
        console.log(`shortestPath: ${iterations} iterations in ${durationShortest}ms -> ${rpsShortest.toFixed(2)} RPS`);
        console.log(`kHopNeighborhood: ${iterations} iterations in ${durationKHop}ms -> ${rpsKHop.toFixed(2)} RPS`);
        console.log(`====================================\n`);
    });
});
