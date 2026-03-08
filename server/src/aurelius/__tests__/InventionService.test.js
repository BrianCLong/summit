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
const mockSession = {
    run: globals_1.jest.fn(),
    close: globals_1.jest.fn().mockResolvedValue(undefined),
};
const mockDriver = {
    session: globals_1.jest.fn(() => mockSession),
};
const mockFindSimilar = globals_1.jest.fn();
let InventionService;
let dbModule;
let priorArtModule;
(0, globals_1.describe)('InventionService', () => {
    let service;
    (0, globals_1.beforeAll)(async () => {
        dbModule = await Promise.resolve().then(() => __importStar(require('../../config/database.js')));
        priorArtModule = await Promise.resolve().then(() => __importStar(require('../services/PriorArtService.js')));
        ({ InventionService } = await Promise.resolve().then(() => __importStar(require('../services/InventionService.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.spyOn(dbModule, 'getNeo4jDriver').mockReturnValue(mockDriver);
        globals_1.jest
            .spyOn(priorArtModule.PriorArtService, 'getInstance')
            .mockReturnValue({ findSimilar: mockFindSimilar });
        // Reset instance to force constructor to run again with fresh mocks
        InventionService.instance = undefined;
        service = InventionService.getInstance();
        mockDriver.session.mockImplementation(() => mockSession);
        mockSession.run.mockReset();
        mockFindSimilar.mockReset();
    });
    (0, globals_1.it)('should reject invention if too similar to prior art', async () => {
        mockFindSimilar.mockResolvedValueOnce([{ title: 'Exact Match', score: 0.95 }]);
        mockSession.run.mockResolvedValueOnce({
            records: [{ get: () => 'mock-uuid-123' }],
        });
        await (0, globals_1.expect)(service.generateInvention(['AI'], 'Solve everything', 'tenant-1')).rejects.toThrow('Proposed idea is too similar');
    });
    (0, globals_1.it)('should generate invention draft if novel', async () => {
        mockFindSimilar.mockResolvedValueOnce([{ title: 'Distant Art', score: 0.3 }]);
        mockSession.run.mockResolvedValueOnce({
            records: [{ get: () => 'mock-uuid-123' }],
        });
        const result = await service.generateInvention(['Quantum Computing', 'Coffee'], 'Make better coffee using qubits', 'tenant-1');
        (0, globals_1.expect)(result).toHaveProperty('id');
        (0, globals_1.expect)(result.title).toContain('Novel System');
        (0, globals_1.expect)(result.noveltyScore).toBeGreaterThan(0.5);
        (0, globals_1.expect)(result.priorArtUsed).toContain('Distant Art');
    });
});
