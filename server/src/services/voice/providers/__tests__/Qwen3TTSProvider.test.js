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
const mockGetInstance = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../VoiceProvenanceLedger.js', () => ({
    VoiceProvenanceLedger: {
        getInstance: mockGetInstance,
    },
}));
const { Qwen3TTSProvider } = await Promise.resolve().then(() => __importStar(require('../Qwen3TTSProvider.js')));
const { VoiceProvenanceLedger } = await Promise.resolve().then(() => __importStar(require('../../VoiceProvenanceLedger.js')));
(0, globals_1.describe)('Qwen3TTSProvider', () => {
    let provider;
    let mockLedger;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockLedger = {
            checkPolicy: globals_1.jest.fn().mockResolvedValue({ allowed: true }),
            generateManifest: globals_1.jest.fn().mockReturnValue({
                manifest_id: 'mock-id',
                signature: 'mock-sig'
            })
        };
        VoiceProvenanceLedger.getInstance.mockReturnValue(mockLedger);
        provider = new Qwen3TTSProvider();
    });
    (0, globals_1.it)('should generate voice design', async () => {
        const result = await provider.generateVoiceDesign({ description: 'test' }, 'hello');
        (0, globals_1.expect)(result.audio).toBeDefined();
        (0, globals_1.expect)(result.provenance).toBeDefined();
        (0, globals_1.expect)(mockLedger.checkPolicy).toHaveBeenCalled();
    });
    (0, globals_1.it)('should stream speak', async () => {
        const job = {
            text: ['hello', 'world'],
            tenant_id: 't1',
            voice_ref: 'v1'
        };
        const callbacks = {
            onAudio: globals_1.jest.fn(),
            onError: globals_1.jest.fn(),
            onComplete: globals_1.jest.fn()
        };
        await provider.streamSpeak(job, callbacks);
        (0, globals_1.expect)(callbacks.onAudio).toHaveBeenCalled();
        (0, globals_1.expect)(callbacks.onComplete).toHaveBeenCalled();
        (0, globals_1.expect)(callbacks.onError).not.toHaveBeenCalled();
    });
});
