"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const CausalGraphService_js_1 = require("../services/CausalGraphService.js");
// Mock Neo4j driver and session
const mockRun = globals_1.jest.fn();
const mockClose = globals_1.jest.fn();
const mockSession = globals_1.jest.fn(() => ({
    run: mockRun,
    close: mockClose,
}));
globals_1.jest.mock('../config/database', () => ({
    getNeo4jDriver: globals_1.jest.fn(() => ({
        session: mockSession,
    })),
}));
(0, globals_1.describe)('CausalGraphService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        // Reset the mock return value before creating the service
        // The service constructor calls getNeo4jDriver()
        mockSession.mockReturnValue({
            run: mockRun,
            close: mockClose,
        });
        require('../config/database').getNeo4jDriver.mockReturnValue({
            session: mockSession,
        });
        service = new CausalGraphService_js_1.CausalGraphService();
        mockRun.mockClear();
        mockClose.mockClear();
    });
    (0, globals_1.it)('should generate a causal graph with explicit causal relationships', async () => {
        // Mock data
        const nodesMock = {
            records: [
                {
                    get: (key) => {
                        const data = {
                            id: 'event1',
                            label: 'Event 1',
                            types: ['Event'],
                            date: '2023-01-01T10:00:00Z',
                        };
                        return data[key] !== undefined ? data[key] : (key === 'types' ? ['Event'] : null);
                    },
                },
                {
                    get: (key) => {
                        const data = {
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
                    get: (key) => {
                        const data = {
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
        (0, globals_1.expect)(result.nodes).toHaveLength(2);
        (0, globals_1.expect)(result.edges).toHaveLength(1);
        (0, globals_1.expect)(result.edges[0].type).toBe('INFLUENCED');
        (0, globals_1.expect)(result.edges[0].weight).toBeGreaterThan(0.9); // Explicit CAUSED + temporal precedence
        (0, globals_1.expect)(result.edges[0].evidence).toContain('Explicit relationship');
        (0, globals_1.expect)(result.edges[0].evidence).toContain('Temporal precedence');
    });
    (0, globals_1.it)('should infer causality from temporal precedence on weak links', async () => {
        // Mock data
        const nodesMock = {
            records: [
                {
                    get: (key) => {
                        const data = {
                            id: 'event1',
                            label: 'Event 1',
                            types: ['Event'],
                            date: '2023-01-01T10:00:00Z',
                        };
                        return data[key] !== undefined ? data[key] : (key === 'types' ? ['Event'] : null);
                    },
                },
                {
                    get: (key) => {
                        const data = {
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
                    get: (key) => {
                        const data = {
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
        (0, globals_1.expect)(result.edges).toHaveLength(1);
        (0, globals_1.expect)(result.edges[0].weight).toBeGreaterThan(0.4);
        (0, globals_1.expect)(result.edges[0].evidence).toContain('Temporal precedence');
    });
});
