"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmSecurityService = exports.LlmSecurityService = void 0;
const PolicyService_js_1 = require("./PolicyService.js");
const DLPService_js_1 = require("./DLPService.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class LlmSecurityService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!LlmSecurityService.instance) {
            LlmSecurityService.instance = new LlmSecurityService();
        }
        return LlmSecurityService.instance;
    }
    /**
     * Pre-flight check before sending data to LLM.
     * Checks policy, cost limits (placeholder), and detects PII/Secrets.
     */
    async validatePrompt(prompt, context, model) {
        // 1. Policy Check (e.g. is model allowed for this purpose/tenant?)
        const policyCtx = {
            principal: context.principal,
            resource: {
                type: 'llm_model',
                id: model,
                tenantId: context.tenantId,
                purpose: context.purpose,
                sensitivity: context.dataSensitivity
            },
            action: 'invoke_llm',
            environment: {
                time: new Date().toISOString()
            }
        };
        const decision = await PolicyService_js_1.policyService.evaluate(policyCtx);
        if (!decision.allow) {
            return { allowed: false, redactedPrompt: '', reason: decision.reason || 'Policy denied LLM access' };
        }
        // 2. DLP Scan on Prompt (prevent leaking PII/Secrets to LLM)
        const dlpCtx = {
            userId: context.principal.id,
            tenantId: context.tenantId,
            userRole: context.principal.role,
            operationType: 'export', // Sending to external LLM is effectively an export
            contentType: 'llm_prompt',
            metadata: {
                model,
                purpose: context.purpose
            }
        };
        try {
            const scanResults = await DLPService_js_1.dlpService.scanContent(prompt, dlpCtx);
            // If any blocking action is recommended
            const hasBlocking = scanResults.some(r => r.matched && r.recommendedActions.some(a => a.type === 'block'));
            if (hasBlocking) {
                // Emit security event
                logger_js_1.default.warn('LLM prompt blocked by DLP', { context, model });
                return { allowed: false, redactedPrompt: '', reason: 'DLP violation: prompt contains sensitive data' };
            }
            // Apply redactions if recommended
            const { processedContent } = await DLPService_js_1.dlpService.applyActions(prompt, scanResults, dlpCtx);
            let finalPrompt = typeof processedContent === 'string' ? processedContent : JSON.stringify(processedContent);
            return { allowed: true, redactedPrompt: finalPrompt };
        }
        catch (e) {
            logger_js_1.default.error('DLP scan error during LLM pre-flight', e);
            // Fail closed
            return { allowed: false, redactedPrompt: '', reason: 'Security check failed' };
        }
    }
    /**
     * Post-processing on LLM response (optional, e.g. checking for hallucinations of PII)
     */
    async validateResponse(response, context) {
        // similar DLP check
        return response;
    }
}
exports.LlmSecurityService = LlmSecurityService;
exports.llmSecurityService = LlmSecurityService.getInstance();
