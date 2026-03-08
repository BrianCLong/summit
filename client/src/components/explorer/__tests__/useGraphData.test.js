"use strict";
/**
 * useGraphData Hook Tests
 * Tests for GraphQL data hooks
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const testing_1 = require("@apollo/client/testing");
const react_2 = __importDefault(require("react"));
const useGraphData_1 = require("../useGraphData");
// Mock data
const mockGraphData = {
    graphData: {
        nodes: [
            {
                id: '1',
                label: 'Test Entity',
                type: 'PERSON',
                description: 'Test description',
                confidence: 0.9,
                properties: null,
                source: 'manual',
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            },
        ],
        edges: [
            {
                id: 'e1',
                fromEntityId: '1',
                toEntityId: '2',
                type: 'RELATED',
                label: 'Related To',
                confidence: 0.8,
                properties: null,
                source: 'auto',
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            },
        ],
        nodeCount: 1,
        edgeCount: 1,
    },
};
const mockEntityDetails = {
    getEntityDetails: {
        id: '1',
        label: 'Test Entity',
        type: 'PERSON',
        description: 'Test description',
        confidence: 0.9,
        properties: { key: 'value' },
        source: 'manual',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        attack_ttps: ['T1001'],
        capec_ttps: null,
        actor_links: null,
        triage_score: 0.75,
    },
};
const mockSearchResults = {
    searchEntities: [
        {
            id: '1',
            label: 'Search Result',
            type: 'PERSON',
            description: 'Found entity',
            confidence: 0.85,
        },
    ],
};
const mockEnrichment = {
    entityEnrichment: {
        entityId: '1',
        lastEnriched: '2024-01-01T00:00:00Z',
        externalSources: [
            {
                source: 'OSINT',
                data: { info: 'test' },
                confidence: 0.9,
                lastUpdated: '2024-01-01T00:00:00Z',
            },
        ],
        geolocation: {
            country: 'US',
            city: 'New York',
            latitude: 40.7128,
            longitude: -74.006,
            accuracy: 0.95,
        },
        reputation: {
            score: 0.8,
            category: 'trusted',
            sources: ['source1', 'source2'],
            lastChecked: '2024-01-01T00:00:00Z',
        },
        relatedEntities: [
            {
                id: '2',
                type: 'ORGANIZATION',
                label: 'Related Org',
                description: 'Related organization',
            },
        ],
    },
};
// Wrapper for hooks that require Apollo Provider
const createWrapper = (mocks) => {
    return ({ children }) => react_2.default.createElement(testing_1.MockedProvider, { mocks, addTypename: false }, children);
};
describe('useGraphData', () => {
    it('returns loading state initially', () => {
        const mocks = [
            {
                request: {
                    query: useGraphData_1.GET_GRAPH_DATA,
                    variables: { investigationId: 'test-id' },
                },
                result: { data: mockGraphData },
            },
        ];
        const { result } = (0, react_1.renderHook)(() => (0, useGraphData_1.useGraphData)({ investigationId: 'test-id' }), { wrapper: createWrapper(mocks) });
        expect(result.current.loading).toBe(true);
        expect(result.current.nodes).toEqual([]);
        expect(result.current.edges).toEqual([]);
    });
    it('returns graph data after loading', async () => {
        const mocks = [
            {
                request: {
                    query: useGraphData_1.GET_GRAPH_DATA,
                    variables: { investigationId: 'test-id' },
                },
                result: { data: mockGraphData },
            },
        ];
        const { result } = (0, react_1.renderHook)(() => (0, useGraphData_1.useGraphData)({ investigationId: 'test-id' }), { wrapper: createWrapper(mocks) });
        await (0, react_1.waitFor)(() => {
            expect(result.current.loading).toBe(false);
        });
        expect(result.current.nodes).toHaveLength(1);
        expect(result.current.edges).toHaveLength(1);
        expect(result.current.nodeCount).toBe(1);
        expect(result.current.edgeCount).toBe(1);
    });
    it('transforms nodes correctly', async () => {
        const mocks = [
            {
                request: {
                    query: useGraphData_1.GET_GRAPH_DATA,
                    variables: { investigationId: 'test-id' },
                },
                result: { data: mockGraphData },
            },
        ];
        const { result } = (0, react_1.renderHook)(() => (0, useGraphData_1.useGraphData)({ investigationId: 'test-id' }), { wrapper: createWrapper(mocks) });
        await (0, react_1.waitFor)(() => {
            expect(result.current.loading).toBe(false);
        });
        const node = result.current.nodes[0];
        expect(node.id).toBe('1');
        expect(node.label).toBe('Test Entity');
        expect(node.type).toBe('PERSON');
    });
    it('generates Cytoscape elements', async () => {
        const mocks = [
            {
                request: {
                    query: useGraphData_1.GET_GRAPH_DATA,
                    variables: { investigationId: 'test-id' },
                },
                result: { data: mockGraphData },
            },
        ];
        const { result } = (0, react_1.renderHook)(() => (0, useGraphData_1.useGraphData)({ investigationId: 'test-id' }), { wrapper: createWrapper(mocks) });
        await (0, react_1.waitFor)(() => {
            expect(result.current.loading).toBe(false);
        });
        expect(result.current.cytoscapeElements).toHaveLength(2);
    });
    it('handles errors', async () => {
        const mocks = [
            {
                request: {
                    query: useGraphData_1.GET_GRAPH_DATA,
                    variables: { investigationId: 'test-id' },
                },
                error: new Error('Network error'),
            },
        ];
        const { result } = (0, react_1.renderHook)(() => (0, useGraphData_1.useGraphData)({ investigationId: 'test-id' }), { wrapper: createWrapper(mocks) });
        await (0, react_1.waitFor)(() => {
            expect(result.current.error).toBeTruthy();
        });
        expect(result.current.error?.message).toBe('Network error');
    });
});
describe('useEntityDetails', () => {
    it('returns null when entityId is null', () => {
        const { result } = (0, react_1.renderHook)(() => (0, useGraphData_1.useEntityDetails)(null), {
            wrapper: createWrapper([]),
        });
        expect(result.current.entity).toBeNull();
        expect(result.current.loading).toBe(false);
    });
    it('fetches entity details', async () => {
        const mocks = [
            {
                request: {
                    query: useGraphData_1.GET_ENTITY_DETAILS,
                    variables: { entityId: '1' },
                },
                result: { data: mockEntityDetails },
            },
        ];
        const { result } = (0, react_1.renderHook)(() => (0, useGraphData_1.useEntityDetails)('1'), {
            wrapper: createWrapper(mocks),
        });
        await (0, react_1.waitFor)(() => {
            expect(result.current.loading).toBe(false);
        });
        expect(result.current.entity?.id).toBe('1');
        expect(result.current.entity?.label).toBe('Test Entity');
    });
});
describe('useEntitySearch', () => {
    it('returns empty results initially', () => {
        const { result } = (0, react_1.renderHook)(() => (0, useGraphData_1.useEntitySearch)(), {
            wrapper: createWrapper([]),
        });
        expect(result.current.results).toEqual([]);
        expect(result.current.loading).toBe(false);
    });
    it('provides search function', () => {
        const { result } = (0, react_1.renderHook)(() => (0, useGraphData_1.useEntitySearch)(), {
            wrapper: createWrapper([]),
        });
        expect(typeof result.current.search).toBe('function');
    });
});
describe('useEnrichment', () => {
    it('returns null when entityId is null', () => {
        const { result } = (0, react_1.renderHook)(() => (0, useGraphData_1.useEnrichment)(null), {
            wrapper: createWrapper([]),
        });
        expect(result.current.enrichment).toBeNull();
        expect(result.current.loading).toBe(false);
    });
    it('fetches enrichment data', async () => {
        const mocks = [
            {
                request: {
                    query: useGraphData_1.GET_ENRICHMENT,
                    variables: { entityId: '1' },
                },
                result: { data: mockEnrichment },
            },
        ];
        const { result } = (0, react_1.renderHook)(() => (0, useGraphData_1.useEnrichment)('1'), {
            wrapper: createWrapper(mocks),
        });
        await (0, react_1.waitFor)(() => {
            expect(result.current.loading).toBe(false);
        });
        expect(result.current.enrichment?.entityId).toBe('1');
        expect(result.current.enrichment?.reputation.score).toBe(0.8);
        expect(result.current.enrichment?.geolocation?.country).toBe('US');
    });
});
