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
let SavedQueryService;
const mockQuery = globals_1.jest.fn();
const mockRelease = globals_1.jest.fn();
const mockConnect = globals_1.jest.fn();
const mockClient = { query: mockQuery, release: mockRelease };
const mockPool = {
    connect: mockConnect,
    query: mockQuery,
};
(0, globals_1.beforeAll)(async () => {
    globals_1.jest.resetModules();
    await globals_1.jest.unstable_mockModule('../src/config/database', () => ({
        getPostgresPool: globals_1.jest.fn(() => mockPool),
    }));
    ({ SavedQueryService } = await Promise.resolve().then(() => __importStar(require('../src/services/SavedQueryService.js'))));
    await Promise.resolve().then(() => __importStar(require('../src/config/database.js')));
});
(0, globals_1.describe)('SavedQueryService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        SavedQueryService.instance = undefined;
        mockConnect.mockImplementation(async () => mockClient);
        service = SavedQueryService.getInstance();
        service.pool = mockPool;
    });
    (0, globals_1.it)('should create a saved query', async () => {
        const input = {
            name: 'Test Query',
            cypher: 'MATCH (n) RETURN n',
            parameters: {},
            tags: ['test'],
            scope: 'private',
        };
        const userId = 'user-1';
        const tenantId = 'tenant-1';
        mockQuery.mockImplementationOnce(async () => ({ rows: [{ ...input, id: '123' }] }));
        const result = await service.create(input, userId, tenantId);
        (0, globals_1.expect)(mockQuery).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO saved_queries'), globals_1.expect.arrayContaining(['Test Query', 'user-1', 'tenant-1']));
        (0, globals_1.expect)(result).toHaveProperty('id', '123');
    });
    (0, globals_1.it)('should list saved queries', async () => {
        mockQuery.mockImplementationOnce(async () => ({ rows: [] }));
        await service.list('user-1', 'tenant-1');
        (0, globals_1.expect)(mockQuery).toHaveBeenCalledWith(globals_1.expect.stringContaining('SELECT * FROM saved_queries'), ['tenant-1', 'user-1']);
    });
});
