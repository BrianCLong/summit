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
const getNeo4jDriverMock = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../db/neo4j.js', () => ({
    getNeo4jDriver: getNeo4jDriverMock,
}));
(0, globals_1.describe)('CryptoIntelligenceService', () => {
    let CryptoIntelligenceService;
    let service;
    let mockDriver;
    let mockSession;
    (0, globals_1.beforeAll)(async () => {
        ({ CryptoIntelligenceService } = await Promise.resolve().then(() => __importStar(require('../CryptoIntelligenceService.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        mockSession = {
            run: globals_1.jest.fn(),
            close: globals_1.jest.fn(),
        };
        mockDriver = {
            session: globals_1.jest.fn().mockReturnValue(mockSession),
        };
        getNeo4jDriverMock.mockReturnValue(mockDriver);
        // Reset instance to ensure fresh start
        // @ts-ignore
        CryptoIntelligenceService.instance = undefined;
        service = CryptoIntelligenceService.getInstance();
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('analyzeTransactionPattern', () => {
        (0, globals_1.it)('should detect structuring pattern', async () => {
            const result = await service.analyzeTransactionPattern('0xdeadbeef', 'ETH');
            (0, globals_1.expect)(result.riskLevel).toBe('high');
            (0, globals_1.expect)(result.patternType).toBe('structuring');
        });
        (0, globals_1.it)('should return low risk for normal transactions', async () => {
            const result = await service.analyzeTransactionPattern('0x12345678', 'ETH');
            (0, globals_1.expect)(result.riskLevel).toBe('low');
        });
    });
    (0, globals_1.describe)('clusterWallets', () => {
        (0, globals_1.it)('should return related addresses from graph', async () => {
            mockSession.run.mockResolvedValue({
                records: [
                    { get: (key) => key === 'relatedAddress' ? '0xrelated1' : null },
                    { get: (key) => key === 'relatedAddress' ? '0xrelated2' : null },
                ],
            });
            const result = await service.clusterWallets('0xmain', 'ETH');
            (0, globals_1.expect)(result.mainAddress).toBe('0xmain');
            (0, globals_1.expect)(result.relatedAddresses).toContain('0xrelated1');
            (0, globals_1.expect)(result.relatedAddresses).toContain('0xrelated2');
        });
        (0, globals_1.it)('should return mock data if graph is empty', async () => {
            mockSession.run.mockResolvedValue({ records: [] });
            const result = await service.clusterWallets('0xempty', 'ETH');
            (0, globals_1.expect)(result.relatedAddresses.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.confidence).toBe(0.85);
        });
    });
    (0, globals_1.describe)('detectMixingService', () => {
        (0, globals_1.it)('should detect known mixers', async () => {
            const result = await service.detectMixingService('0xtornado', 'ETH');
            (0, globals_1.expect)(result.isMixer).toBe(true);
            (0, globals_1.expect)(result.serviceName).toBe('TornadoCash');
        });
    });
    (0, globals_1.describe)('monitorDarkWeb', () => {
        (0, globals_1.it)('should return hits for specific keywords', async () => {
            const result = await service.monitorDarkWeb('SilkRoad', 'ransom');
            (0, globals_1.expect)(result.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result[0].keyword).toBe('ransom');
        });
    });
});
