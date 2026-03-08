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
// Mock functions declared before mocks
const mockRunCypher = globals_1.jest.fn();
const mockGetDriver = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../graph/neo4j.js', () => ({
    runCypher: mockRunCypher,
    getDriver: mockGetDriver,
}));
(0, globals_1.describe)('Neo4jGraphService', () => {
    let Neo4jGraphService;
    let service;
    const tenantId = 'test-tenant';
    (0, globals_1.beforeAll)(async () => {
        ({ Neo4jGraphService } = await Promise.resolve().then(() => __importStar(require('../GraphService.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        // @ts-ignore - reset singleton between tests to ensure mocked module is used.
        Neo4jGraphService.instance = undefined;
        service = Neo4jGraphService.getInstance();
    });
    (0, globals_1.describe)('getEntity', () => {
        (0, globals_1.it)('should return entity if found', async () => {
            const mockEntity = {
                id: 'e1',
                tenantId,
                type: 'person',
                label: 'Alice',
                attributes: {},
                metadata: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            mockRunCypher.mockResolvedValue([{ entity: mockEntity }]);
            const result = await service.getEntity(tenantId, 'e1');
            (0, globals_1.expect)(result).toEqual(mockEntity);
            (0, globals_1.expect)(mockRunCypher).toHaveBeenCalledWith(globals_1.expect.stringContaining('MATCH (n:Entity {id: $id, tenantId: $tenantId})'), { id: 'e1', tenantId });
        });
        (0, globals_1.it)('should return null if not found', async () => {
            mockRunCypher.mockResolvedValue([]);
            const result = await service.getEntity(tenantId, 'e1');
            (0, globals_1.expect)(result).toBeNull();
        });
    });
    (0, globals_1.describe)('findEntities', () => {
        (0, globals_1.it)('should search by ids', async () => {
            const mockEntity = { id: 'e1' };
            mockRunCypher.mockResolvedValue([{ entity: mockEntity }]);
            await service.findEntities(tenantId, { ids: ['e1'] });
            (0, globals_1.expect)(mockRunCypher).toHaveBeenCalledWith(globals_1.expect.stringContaining('n.id IN $ids'), globals_1.expect.objectContaining({ ids: ['e1'] }));
        });
    });
    (0, globals_1.describe)('upsertEntity', () => {
        (0, globals_1.it)('should upsert entity', async () => {
            const input = { id: 'e1', type: 'person', label: 'Bob' };
            const output = { ...input, tenantId, attributes: {}, metadata: {} };
            mockRunCypher.mockResolvedValue([{ entity: output }]);
            const result = await service.upsertEntity(tenantId, input);
            (0, globals_1.expect)(result).toEqual(output);
            (0, globals_1.expect)(mockRunCypher).toHaveBeenCalledWith(globals_1.expect.stringContaining('MERGE (n:Entity'), globals_1.expect.anything());
        });
    });
});
