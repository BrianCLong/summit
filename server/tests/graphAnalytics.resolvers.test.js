"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck - Test needs mock type annotations
const resolvers_graphAnalytics_1 = __importDefault(require("../src/graphql/resolvers.graphAnalytics"));
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('graph analytics GraphQL resolvers', () => {
    const baseUser = { id: 'analyst-1', role: 'ANALYST' };
    (0, globals_1.it)('delegates to the service for PageRank', async () => {
        const calculatePageRank = globals_1.jest
            .fn()
            .mockResolvedValue([{ nodeId: 'n1', label: 'Node 1', score: 0.42 }]);
        const context = {
            user: baseUser,
            services: {
                graphAnalytics: {
                    calculatePageRank,
                    detectCommunities: globals_1.jest.fn(),
                },
            },
        };
        const result = await resolvers_graphAnalytics_1.default.Query.graphPageRank(null, { limit: 25, forceRefresh: true }, context);
        (0, globals_1.expect)(calculatePageRank).toHaveBeenCalledWith(globals_1.expect.objectContaining({ limit: 25, forceRefresh: true }));
        (0, globals_1.expect)(result).toEqual([
            globals_1.expect.objectContaining({ nodeId: 'n1', score: 0.42, pageRank: 0.42 }),
        ]);
    });
    (0, globals_1.it)('delegates to the service for community detection', async () => {
        const detectCommunities = globals_1.jest.fn().mockResolvedValue([
            {
                communityId: 7,
                size: 12,
                algorithm: 'LOUVAIN',
                nodes: [{ nodeId: 'n1', label: 'Node 1' }],
            },
        ]);
        const context = {
            user: baseUser,
            services: {
                graphAnalytics: {
                    calculatePageRank: globals_1.jest.fn(),
                    detectCommunities,
                },
            },
        };
        const result = await resolvers_graphAnalytics_1.default.Query.graphCommunities(null, { limit: 10, algorithm: 'LABEL_PROPAGATION' }, context);
        (0, globals_1.expect)(detectCommunities).toHaveBeenCalledWith(globals_1.expect.objectContaining({ limit: 10, algorithm: 'LABEL_PROPAGATION' }));
        (0, globals_1.expect)(result).toEqual([
            globals_1.expect.objectContaining({
                communityId: 7,
                size: 12,
                nodes: [globals_1.expect.any(Object)],
            }),
        ]);
    });
    (0, globals_1.it)('throws when the user is missing', async () => {
        await (0, globals_1.expect)(resolvers_graphAnalytics_1.default.Query.graphPageRank(null, { limit: 5 }, {
            services: {},
        })).rejects.toThrow('Not authenticated');
    });
    (0, globals_1.it)('throws when the user lacks the required role', async () => {
        const context = {
            user: { id: 'viewer', role: 'VIEWER' },
            services: {
                graphAnalytics: {
                    calculatePageRank: globals_1.jest.fn(),
                    detectCommunities: globals_1.jest.fn(),
                },
            },
        };
        await (0, globals_1.expect)(resolvers_graphAnalytics_1.default.Query.graphCommunities(null, { limit: 1 }, context)).rejects.toThrow('Forbidden');
    });
});
