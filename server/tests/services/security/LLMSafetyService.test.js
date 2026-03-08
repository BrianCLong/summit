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
let LLMSafetyService;
let PolicyService;
let AuditService;
// Mock ClassificationEngine
const mockClassify = globals_1.jest.fn();
const classifyMock = mockClassify;
beforeAll(async () => {
    globals_1.jest.resetModules();
    await globals_1.jest.unstable_mockModule('../../../src/pii/classifier.js', () => ({
        ClassificationEngine: globals_1.jest.fn().mockImplementation(() => ({
            classify: mockClassify,
        })),
    }));
    ({ LLMSafetyService } = await Promise.resolve().then(() => __importStar(require('../../../src/services/security/LLMSafetyService.js'))));
    ({ PolicyService } = await Promise.resolve().then(() => __importStar(require('../../../src/services/security/PolicyService.js'))));
    ({ AuditService } = await Promise.resolve().then(() => __importStar(require('../../../src/services/security/AuditService.js'))));
});
describe('LLMSafetyService', () => {
    const mockUser = { id: 'user-1' };
    let evaluateMock;
    let auditLogMock;
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
        evaluateMock = globals_1.jest.spyOn(PolicyService, 'evaluate');
        auditLogMock = globals_1.jest.spyOn(AuditService, 'log').mockResolvedValue();
        LLMSafetyService.classifier = {
            classify: mockClassify,
        };
    });
    it('should block if policy denies', async () => {
        evaluateMock.mockResolvedValue({ allow: false, reason: 'Denied' });
        await expect(LLMSafetyService.sanitizePrompt('hello', mockUser))
            .rejects.toThrow('LLM Prompt blocked: Denied');
    });
    it('should pass through safe prompt', async () => {
        evaluateMock.mockResolvedValue({ allow: true });
        classifyMock.mockResolvedValue({ entities: [] });
        const result = await LLMSafetyService.sanitizePrompt('hello', mockUser);
        expect(result.safePrompt).toBe('hello');
        expect(result.redacted).toBe(false);
    });
    it('should redact sensitive entities', async () => {
        evaluateMock.mockResolvedValue({ allow: true });
        // "Call me at 555-0199"
        // 555-0199 is at index 11
        classifyMock.mockResolvedValue({
            entities: [
                { type: 'phoneNumber', severity: 'high', start: 11, end: 19 }
            ]
        });
        const result = await LLMSafetyService.sanitizePrompt('Call me at 555-0199', mockUser);
        expect(result.safePrompt).toBe('Call me at [REDACTED:phoneNumber]');
        expect(result.redacted).toBe(true);
        expect(auditLogMock).toHaveBeenCalled();
    });
});
