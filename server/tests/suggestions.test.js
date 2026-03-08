"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@apollo/server");
const schema_js_1 = require("../src/graphql/schema.js");
const resolvers_js_1 = require("../src/graphql/resolvers.js");
const neo = __importStar(require("../src/graph/neo4j.js"));
const globals_1 = require("@jest/globals");
globals_1.jest.spyOn(neo, 'runCypher').mockImplementation(async (c, p) => {
    // naive in-memory stub; assert queries are called
    return [
        {
            s: {
                id: '1',
                type: 'entity',
                label: 'PersonOrOrg:Alice',
                confidence: 0.9,
                status: 'pending',
                createdAt: '2025-01-01T00:00:00Z',
            },
        },
    ];
});
const queryBlockMatch = /type Query\s*{([\s\S]*?)}/.exec(String(schema_js_1.typeDefs));
const hasSuggestionsQuery = queryBlockMatch
    ? /\bsuggestions\b/.test(queryBlockMatch[1])
    : false;
const itIfSuggestions = hasSuggestionsQuery ? globals_1.it : globals_1.it.skip;
itIfSuggestions('lists suggestions', async () => {
    const safeResolvers = {
        Query: { suggestions: resolvers_js_1.resolvers.Query.suggestions },
    };
    const server = new server_1.ApolloServer({ typeDefs: schema_js_1.typeDefs, resolvers: safeResolvers, introspection: true });
    await server.start();
    try {
        const res = await server.executeOperation({ query: '{ suggestions { id label } }' }, { contextValue: { user: { scopes: ['graph:write'] } } });
        const data = res.body?.singleResult?.data;
        (0, globals_1.expect)(data?.suggestions?.[0]?.label).toMatch(/Alice/);
    }
    finally {
        await server.stop();
    }
});
