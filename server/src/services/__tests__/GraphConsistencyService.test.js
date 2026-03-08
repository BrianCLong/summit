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
// Mock dependencies
globals_1.jest.unstable_mockModule('../../db/neo4j.js', () => ({
    getNeo4jDriver: globals_1.jest.fn(),
}));
globals_1.jest.unstable_mockModule('../../config/logger.js', () => ({
    __esModule: true,
    default: {
        child: globals_1.jest.fn().mockReturnThis(),
        info: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
    },
}));
(0, globals_1.describe)('GraphConsistencyService', () => {
    let GraphConsistencyService;
    let getNeo4jDriver;
    let mockSession;
    let mockDriver;
    (0, globals_1.beforeAll)(async () => {
        ({ GraphConsistencyService } = await Promise.resolve().then(() => __importStar(require('../GraphConsistencyService.js'))));
        ({ getNeo4jDriver } = await Promise.resolve().then(() => __importStar(require('../../db/neo4j.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        mockSession = {
            run: globals_1.jest.fn(),
            close: globals_1.jest.fn(),
        };
        mockDriver = {
            session: globals_1.jest.fn().mockReturnValue(mockSession),
        };
        getNeo4jDriver.mockReturnValue(mockDriver);
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('detectDanglingNodes should run correct cypher', async () => {
        const service = new GraphConsistencyService();
        mockSession.run.mockResolvedValue({
            records: [
                { get: (key) => ({ properties: { id: 'node1' } }) }
            ]
        });
        const nodes = await service.detectDanglingNodes();
        (0, globals_1.expect)(nodes).toHaveLength(1);
        (0, globals_1.expect)(nodes[0].id).toBe('node1');
        (0, globals_1.expect)(mockSession.run).toHaveBeenCalledWith(globals_1.expect.stringContaining('MATCH (n) WHERE NOT (n)--()'));
    });
    (0, globals_1.it)('detectSchemaViolations should check all relationships', async () => {
        const service = new GraphConsistencyService();
        // First call gets relationship types
        mockSession.run.mockResolvedValueOnce({
            records: [
                { get: () => 'OWNS' }
            ]
        });
        // Second call checks violations for OWNS
        mockSession.run.mockResolvedValueOnce({
            records: []
        });
        const violations = await service.detectSchemaViolations();
        (0, globals_1.expect)(violations).toEqual([]);
        (0, globals_1.expect)(mockSession.run).toHaveBeenCalledTimes(2);
        // The query should check for NOT ( (a:Person AND b:Asset) OR (a:Org AND b:Asset) )
        (0, globals_1.expect)(mockSession.run).toHaveBeenLastCalledWith(globals_1.expect.stringContaining('WHERE NOT ((a:Person AND b:Asset) OR (a:Org AND b:Asset))'));
    });
    (0, globals_1.it)('healOrQueue should queue tasks when issues found', async () => {
        const service = new GraphConsistencyService();
        // Mock detectDanglingNodes
        // @ts-ignore
        service.detectDanglingNodes = globals_1.jest.fn().mockResolvedValue([{ id: 'badNode' }]);
        // Mock detectSchemaViolations
        // @ts-ignore
        service.detectSchemaViolations = globals_1.jest.fn().mockResolvedValue([{ type: 'violation' }]);
        const report = await service.healOrQueue(false);
        (0, globals_1.expect)(report.danglingNodesCount).toBe(1);
        (0, globals_1.expect)(report.schemaViolationsCount).toBe(1);
        (0, globals_1.expect)(report.queuedTasksCount).toBe(2);
        (0, globals_1.expect)(report.details.length).toBe(2);
    });
    (0, globals_1.it)('generateWeeklyReport should return a string report', async () => {
        const service = new GraphConsistencyService();
        // @ts-ignore
        service.healOrQueue = globals_1.jest.fn().mockResolvedValue({
            timestamp: new Date(),
            danglingNodesCount: 5,
            schemaViolationsCount: 2,
            healedCount: 0,
            queuedTasksCount: 7,
            details: ['Queued 5 dangling', 'Queued 2 violations']
        });
        const text = await service.generateWeeklyReport();
        (0, globals_1.expect)(text).toContain('Dangling Nodes: 5');
        (0, globals_1.expect)(text).toContain('Schema Violations: 2');
    });
});
