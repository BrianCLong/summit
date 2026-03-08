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
const globals_1 = require("@jest/globals");
// Define mocks before imports
const mockNeoRun = globals_1.jest.fn();
const mockPgManyOrNone = globals_1.jest.fn().mockResolvedValue([]);
globals_1.jest.unstable_mockModule('../../db/neo4j.js', () => ({
    neo: {
        run: mockNeoRun
    }
}));
globals_1.jest.unstable_mockModule('../../db/pg.js', () => ({
    pg: {
        manyOrNone: mockPgManyOrNone
    }
}));
// Dynamic imports
const { KnowledgeFabricRetrievalService } = await Promise.resolve().then(() => __importStar(require('../retrieval.js')));
const { CypherGuard } = await Promise.resolve().then(() => __importStar(require('../cypherInvariance.js')));
// Import the mocked module to access the mock function if needed,
// but we can also use the closure variable mockNeoRun which IS accessible
// because unstable_mockModule factory IS executed in scope (unlike jest.mock hoist)
// actually wait, unstable_mockModule factory is also sandboxed/hoisted?
// No, unstable_mockModule is NOT hoisted automatically in the same way, but it must be called before import.
// Using closure variable is safer if we define it in the factory scope or globally?
// Actually jest.unstable_mockModule documentation says:
// "The factory function returns a Promise that resolves to the module namespace object."
// We can use variables if we are careful.
// Let's rely on importing the mock back.
const { neo } = await Promise.resolve().then(() => __importStar(require('../../db/neo4j.js')));
(0, globals_1.describe)('Counterfactual Reasoning & Evidence Contracts', () => {
    let service; // Type as any or generic to avoid strict type issues with dynamic import
    const mockLogger = { error: globals_1.jest.fn(), info: globals_1.jest.fn() };
    (0, globals_1.beforeEach)(() => {
        service = new KnowledgeFabricRetrievalService(mockLogger);
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.test)('Should enforce Cypher invariants (Shape Invariance)', () => {
        const rawQuery = "MATCH (n) RETURN n";
        const safeQuery = CypherGuard.enforceInvariants(rawQuery, { strict: false, defaultLimit: 10 });
        (0, globals_1.expect)(safeQuery).toContain('LIMIT 10');
        (0, globals_1.expect)(safeQuery).not.toContain('ORDER BY'); // Not strict, so just warning/missing
    });
    (0, globals_1.test)('Should throw error on invariant violation in strict mode', () => {
        const rawQuery = "MATCH (n) RETURN n";
        (0, globals_1.expect)(() => {
            CypherGuard.enforceInvariants(rawQuery, { strict: true, defaultLimit: 10 });
        }).toThrow('Invariant Violation');
    });
    (0, globals_1.test)('Should return an Evidence Bundle with manifest', async () => {
        // Mock Neo4j response
        neo.run.mockResolvedValue({
            records: []
        });
        const result = await service.search({
            tenantId: 't1',
            queryText: 'test',
            filters: { entityIds: ['e1'] }
        });
        (0, globals_1.expect)(result.results.length).toBeGreaterThan(0);
        const contract = result.results[0];
        // Check Evidence Contract Fields
        (0, globals_1.expect)(contract.schemaVersion).toBe('1.0.0');
        (0, globals_1.expect)(contract.manifest).toBeDefined();
        (0, globals_1.expect)(contract.manifest.strategy).toBe('HYBRID');
        (0, globals_1.expect)(contract.manifest.sources).toContain('neo4j:knowledge_graph');
    });
    (0, globals_1.test)('Counterfactual Simulation: Removing a node changes the evidence hash', async () => {
        // This test simulates a "What if X was missing?" scenario by manipulating the mock return
        const mockRecord1 = {
            get: (key) => {
                if (key === 'n')
                    return { properties: { id: 'n1', pageRank: 0.5 }, labels: ['Person'], identity: { toString: () => 'n1' } };
                if (key === 'm')
                    return { properties: { id: 'm1', pageRank: 0.2 }, labels: ['Location'], identity: { toString: () => 'm1' } };
                if (key === 'r')
                    return { identity: { toString: () => 'r1' }, start: { toString: () => 'n1' }, end: { toString: () => 'm1' }, type: 'LIVES_IN', properties: {} };
                return null;
            }
        };
        // Run 1: Full Graph
        neo.run.mockResolvedValueOnce({
            records: [mockRecord1]
        });
        const result1 = await service.search({ tenantId: 't1', queryText: 'test', filters: { entityIds: ['n1'] } });
        const evidence1 = result1.results[0].graphEvidence;
        // Run 2: Counterfactual (Node m1 is missing)
        const mockRecord2 = {
            get: (key) => {
                if (key === 'n')
                    return { properties: { id: 'n1', pageRank: 0.5 }, labels: ['Person'], identity: { toString: () => 'n1' } };
                if (key === 'm')
                    return null; // m1 is gone
                if (key === 'r')
                    return null; // relationship is gone
                return null;
            }
        };
        neo.run.mockResolvedValueOnce({
            records: [mockRecord2]
        });
        const result2 = await service.search({ tenantId: 't1', queryText: 'test', filters: { entityIds: ['n1'] } });
        const evidence2 = result2.results[0].graphEvidence;
        (0, globals_1.expect)(evidence1?.nodes.length).toBe(2);
        (0, globals_1.expect)(evidence2?.nodes.length).toBe(1);
        (0, globals_1.expect)(evidence1).not.toEqual(evidence2);
    });
});
