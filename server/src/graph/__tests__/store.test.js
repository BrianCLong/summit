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
await globals_1.jest.unstable_mockModule('../neo4j', () => ({
    runCypher: globals_1.jest.fn(),
    getDriver: globals_1.jest.fn(),
}));
const { GraphStore } = await Promise.resolve().then(() => __importStar(require('../store.js')));
const { runCypher } = await Promise.resolve().then(() => __importStar(require('../neo4j.js')));
(0, globals_1.describe)('GraphStore', () => {
    let store;
    (0, globals_1.beforeEach)(() => {
        store = new GraphStore();
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('should upsert a node with correct params', async () => {
        const node = {
            globalId: 'user-123',
            tenantId: 'tenant-a',
            entityType: 'Actor',
            attributes: { name: 'Alice' }
        };
        const mockedRunCypher = runCypher;
        // @ts-expect-error lenient test mock setup
        mockedRunCypher.mockResolvedValue([]);
        await store.upsertNode(node);
        (0, globals_1.expect)(runCypher).toHaveBeenCalledWith(globals_1.expect.stringContaining('MERGE (n:GraphNode { globalId: $globalId })'), globals_1.expect.objectContaining({
            globalId: 'user-123',
            tenantId: 'tenant-a',
            attributes: { name: 'Alice' }
        }), globals_1.expect.objectContaining({ tenantId: 'tenant-a', write: true }));
    });
});
