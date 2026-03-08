"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const LlmSecurityService_js_1 = require("../LlmSecurityService.js");
const PolicyService_js_1 = require("../PolicyService.js");
const DLPService_js_1 = require("../DLPService.js");
const mockPolicyEvaluate = globals_1.jest.fn();
const mockDlpScanContent = globals_1.jest.fn();
const mockDlpApplyActions = globals_1.jest.fn();
(0, globals_1.describe)('LlmSecurityService', () => {
    let service;
    const defaultContext = {
        tenantId: 'tenant-123',
        principal: {
            id: 'user-456',
            name: 'Test User',
            role: 'analyst',
        },
        purpose: 'analysis',
        dataSensitivity: 'internal',
    };
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        LlmSecurityService_js_1.LlmSecurityService.instance = null;
        globals_1.jest
            .spyOn(PolicyService_js_1.policyService, 'evaluate')
            .mockImplementation(mockPolicyEvaluate);
        globals_1.jest
            .spyOn(DLPService_js_1.dlpService, 'scanContent')
            .mockImplementation(mockDlpScanContent);
        globals_1.jest
            .spyOn(DLPService_js_1.dlpService, 'applyActions')
            .mockImplementation(mockDlpApplyActions);
        service = LlmSecurityService_js_1.LlmSecurityService.getInstance();
    });
    (0, globals_1.describe)('getInstance()', () => {
        (0, globals_1.it)('returns singleton instance', () => {
            const instance1 = LlmSecurityService_js_1.LlmSecurityService.getInstance();
            const instance2 = LlmSecurityService_js_1.LlmSecurityService.getInstance();
            (0, globals_1.expect)(instance1).toBe(instance2);
        });
    });
    (0, globals_1.describe)('validatePrompt()', () => {
        (0, globals_1.it)('allows prompt when policy approves and no DLP violations', async () => {
            mockPolicyEvaluate.mockResolvedValue({ allow: true });
            mockDlpScanContent.mockResolvedValue([]);
            mockDlpApplyActions.mockResolvedValue({ processedContent: 'test prompt' });
            const result = await service.validatePrompt('Analyze this data', defaultContext, 'gpt-4');
            (0, globals_1.expect)(result.allowed).toBe(true);
            (0, globals_1.expect)(result.redactedPrompt).toBe('test prompt');
        });
        (0, globals_1.it)('denies prompt when policy rejects', async () => {
            mockPolicyEvaluate.mockResolvedValue({
                allow: false,
                reason: 'Model not approved',
            });
            const result = await service.validatePrompt('Analyze this data', defaultContext, 'gpt-4');
            (0, globals_1.expect)(result.allowed).toBe(false);
            (0, globals_1.expect)(result.reason).toBe('Model not approved');
        });
        (0, globals_1.it)('blocks prompt when DLP finds blocking violation', async () => {
            mockPolicyEvaluate.mockResolvedValue({ allow: true });
            mockDlpScanContent.mockResolvedValue([
                {
                    matched: true,
                    pattern: 'ssn',
                    recommendedActions: [{ type: 'block', reason: 'SSN detected' }],
                },
            ]);
            const result = await service.validatePrompt('Patient SSN is 123-45-6789', defaultContext, 'gpt-4');
            (0, globals_1.expect)(result.allowed).toBe(false);
            (0, globals_1.expect)(result.reason).toBe('DLP violation: prompt contains sensitive data');
        });
        (0, globals_1.it)('allows prompt with redaction when DLP recommends redact', async () => {
            mockPolicyEvaluate.mockResolvedValue({ allow: true });
            mockDlpScanContent.mockResolvedValue([
                {
                    matched: true,
                    pattern: 'email',
                    recommendedActions: [{ type: 'redact' }],
                },
            ]);
            mockDlpApplyActions.mockResolvedValue({
                processedContent: 'Contact [REDACTED] for info',
            });
            const result = await service.validatePrompt('Contact john@example.com for info', defaultContext, 'gpt-4');
            (0, globals_1.expect)(result.allowed).toBe(true);
            (0, globals_1.expect)(result.redactedPrompt).toBe('Contact [REDACTED] for info');
        });
        (0, globals_1.it)('fails closed when DLP scan throws error', async () => {
            mockPolicyEvaluate.mockResolvedValue({ allow: true });
            mockDlpScanContent.mockRejectedValue(new Error('DLP unavailable'));
            const result = await service.validatePrompt('Test prompt', defaultContext, 'gpt-4');
            (0, globals_1.expect)(result.allowed).toBe(false);
            (0, globals_1.expect)(result.reason).toBe('Security check failed');
        });
    });
    (0, globals_1.describe)('validateResponse()', () => {
        (0, globals_1.it)('returns response unchanged', async () => {
            const response = 'The analysis shows positive trends.';
            const result = await service.validateResponse(response, defaultContext);
            (0, globals_1.expect)(result).toBe(response);
        });
    });
});
