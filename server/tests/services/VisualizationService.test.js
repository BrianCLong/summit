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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const servicePath = path_1.default.resolve(process.cwd(), 'src/services/VisualizationService.js');
const hasService = fs_1.default.existsSync(servicePath);
const describeIf = hasService ? globals_1.describe : globals_1.describe.skip;
describeIf('VisualizationService', () => {
    let VisualizationService;
    let service;
    let mockSession;
    let mockDriver;
    const resolved = (value) => globals_1.jest.fn().mockImplementation(async () => value);
    (0, globals_1.beforeAll)(async () => {
        ({ default: VisualizationService } = await Promise.resolve().then(() => __importStar(require('../../src/services/VisualizationService.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        mockSession = {
            run: resolved({ records: [] }),
            close: resolved(undefined),
        };
        mockDriver = {
            session: globals_1.jest.fn().mockReturnValue(mockSession),
        };
        service = new VisualizationService(mockDriver, {}, {}, { info: globals_1.jest.fn(), error: globals_1.jest.fn(), warn: globals_1.jest.fn() });
    });
    (0, globals_1.it)('should initialize with default types', () => {
        const types = service.getAvailableTypes();
        (0, globals_1.expect)(types.length).toBeGreaterThan(0);
        (0, globals_1.expect)(types.find((t) => t.id === 'NETWORK_GRAPH')).toBeDefined();
    });
    (0, globals_1.it)('createVisualization should return visualization object', async () => {
        const request = {
            type: 'NETWORK_GRAPH',
            userId: 'user-1',
            parameters: { investigationId: 'inv-1' },
        };
        const viz = await service.createVisualization(request);
        (0, globals_1.expect)(viz).toBeDefined();
        (0, globals_1.expect)(viz.id).toBeDefined();
        (0, globals_1.expect)(viz.status).toBe('COMPLETED');
        (0, globals_1.expect)(mockDriver.session).toHaveBeenCalled();
        (0, globals_1.expect)(mockSession.run).toHaveBeenCalled();
    });
    (0, globals_1.it)('exportVisualization should return export data', async () => {
        const viz = await service.createVisualization({
            type: 'NETWORK_GRAPH',
            userId: 'user-1',
            parameters: { investigationId: 'inv-1' },
        });
        const exportData = await service.exportVisualization(viz.id, 'json');
        (0, globals_1.expect)(exportData.status).toBe('COMPLETED');
        (0, globals_1.expect)(exportData.json).toBeDefined();
    });
});
