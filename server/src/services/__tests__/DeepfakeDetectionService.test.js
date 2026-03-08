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
// Use dynamic imports
let DeepfakeDetectionService;
(0, globals_1.beforeAll)(async () => {
    ({ DeepfakeDetectionService } = await Promise.resolve().then(() => __importStar(require('../DeepfakeDetectionService.js'))));
});
(0, globals_1.describe)('DeepfakeDetectionService', () => {
    let service;
    let llmService;
    let visionService;
    (0, globals_1.beforeEach)(() => {
        llmService = {
            complete: globals_1.jest.fn()
        };
        visionService = {
            analyzeImage: globals_1.jest.fn()
        };
        service = new DeepfakeDetectionService(llmService, visionService);
    });
    (0, globals_1.it)('should detect synthetic text', async () => {
        llmService.complete.mockResolvedValue(JSON.stringify({
            isDeepfake: true,
            score: 85,
            riskScore: 85,
            markers: ['repetitive_structure'],
            details: 'Highly repetitive and generic structure consistent with LLM generation.'
        }));
        const result = await service.analyze('This is some synthetic text.', 'TEXT', 'tenant-1');
        (0, globals_1.expect)(result.isDeepfake).toBe(true);
        (0, globals_1.expect)(result.riskScore).toBeGreaterThan(80);
        (0, globals_1.expect)(result.markers).toContain('repetitive_structure');
    });
    (0, globals_1.it)('should analyze images via vision service', async () => {
        visionService.analyzeImage.mockResolvedValue(JSON.stringify({
            isDeepfake: true,
            confidence: 0.9,
            riskScore: 90,
            markers: ['asymmetric_features'],
            details: 'Asymmetric facial features and blurred background artifacts typical of GANs.'
        }));
        const result = await service.analyze('https://example.com/suspect.jpg', 'IMAGE', 'tenant-1');
        (0, globals_1.expect)(result.isDeepfake).toBe(true);
        (0, globals_1.expect)(visionService.analyzeImage).toHaveBeenCalled();
    });
    (0, globals_1.it)('should handle non-deepfake content', async () => {
        llmService.complete.mockResolvedValue(JSON.stringify({
            isDeepfake: false,
            confidence: 0.1,
            riskScore: 10,
            markers: [],
            details: 'Natural variations consistent with human source.'
        }));
        const result = await service.analyze('https://example.com/real_audio.mp3', 'AUDIO', 'tenant-1');
        (0, globals_1.expect)(result.isDeepfake).toBe(false);
        (0, globals_1.expect)(result.riskScore).toBeLessThan(30);
    });
});
