"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CIBDetectionService = void 0;
const globals_1 = require("@jest/globals");
class CIBDetectionService {
    static instance = null;
    static getInstance = globals_1.jest.fn(() => {
        if (!CIBDetectionService.instance) {
            CIBDetectionService.instance = new CIBDetectionService();
        }
        return CIBDetectionService.instance;
    });
    detect = globals_1.jest.fn().mockResolvedValue({
        detected: false,
        confidence: 0,
        indicators: [],
    });
    detectCIB = globals_1.jest.fn().mockResolvedValue({
        campaignId: 'mock-campaign',
        identifiedBotClusters: [],
        anomalies: [],
        precisionScore: 0,
        timestamp: new Date(),
    });
    analyze = globals_1.jest.fn().mockResolvedValue({
        score: 0,
        factors: [],
    });
    getIndicators = globals_1.jest.fn().mockResolvedValue([]);
    reset = globals_1.jest.fn();
}
exports.CIBDetectionService = CIBDetectionService;
exports.default = CIBDetectionService;
