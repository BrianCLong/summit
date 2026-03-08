"use strict";
/**
 * Secured LLM Service
 *
 * Wraps the existing LLMService with comprehensive security guardrails
 * for prompt injection defense, output sanitization, and invertibility auditing.
 *
 * Usage:
 *   import { securedLLM } from './services/SecuredLLMService.js';
 *
 *   const result = await securedLLM.complete(
 *     prompt: 'User input here',
 *     userId: 'user-123',
 *     tenantId: 'tenant-456',
 *     privacyLevel: 'confidential',
 *   });
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securedLLM = exports.SecuredLLMService = void 0;
const llm_guardrails_js_1 = require("../security/llm-guardrails.js");
// @ts-ignore
const pino_1 = __importDefault(require("pino"));
// @ts-ignore - JS import
const LLMService_js_1 = __importDefault(require("./LLMService.js"));
// @ts-ignore
const logger = pino_1.default({ name: 'SecuredLLMService' });
/**
 * Secured LLM Service with integrated guardrails
 */
class SecuredLLMService {
    llmService;
    guardrails;
    constructor(config) {
        // @ts-ignore
        this.llmService = new LLMService_js_1.default(config);
        this.guardrails = new llm_guardrails_js_1.LLMGuardrailsService();
        logger.info('Secured LLM Service initialized with guardrails');
    }
    /**
     * Secured text completion with guardrails
     */
    async complete(params) {
        const startTime = Date.now();
        const provider = this.getProvider();
        const model = params.model || this.getDefaultModel();
        // Emergency bypass check (always logged)
        if (params.skipGuardrails) {
            logger.warn('GUARDRAILS BYPASSED', {
                user_id: params.userId,
                tenant_id: params.tenantId,
                reason: 'skipGuardrails=true',
            });
        }
        let processedPrompt = params.prompt;
        let auditId;
        let inputWarnings = [];
        // Step 1: Input validation with guardrails
        if (!params.skipGuardrails) {
            const inputCheck = await this.guardrails.validateInput({
                prompt: params.prompt,
                userId: params.userId,
                tenantId: params.tenantId,
                modelProvider: provider,
                modelName: model,
                privacyLevel: params.privacyLevel,
                applyDifferentialPrivacy: params.applyDifferentialPrivacy,
            });
            if (!inputCheck.allowed) {
                logger.error('LLM request blocked by guardrails', {
                    user_id: params.userId,
                    reason: inputCheck.reason,
                    risk_score: inputCheck.risk_score,
                });
                throw new Error(`LLM request blocked: ${inputCheck.reason} (risk score: ${inputCheck.risk_score})`);
            }
            // Use redacted/processed prompt if available
            if (inputCheck.redacted_prompt) {
                processedPrompt = inputCheck.redacted_prompt;
                logger.info('Prompt modified by differential privacy', {
                    user_id: params.userId,
                    audit_id: inputCheck.audit_id,
                });
            }
            auditId = inputCheck.audit_id;
            inputWarnings = inputCheck.warnings || [];
            if (inputCheck.risk_score > 0.5) {
                logger.warn('High-risk LLM request allowed with warnings', {
                    user_id: params.userId,
                    audit_id: inputCheck.audit_id,
                    risk_score: inputCheck.risk_score,
                    warnings: inputCheck.warnings,
                });
            }
        }
        // Step 2: Call underlying LLM service
        let rawResponse;
        try {
            rawResponse = await this.llmService.complete({
                ...params,
                prompt: processedPrompt,
            });
        }
        catch (error) {
            logger.error('LLM completion failed', {
                user_id: params.userId,
                audit_id: auditId,
                error: error.message,
            });
            throw error;
        }
        // Step 3: Output validation and sanitization
        let finalResponse = rawResponse;
        let outputWarnings = [];
        let redacted = false;
        if (!params.skipGuardrails) {
            const outputCheck = await this.guardrails.validateOutput({
                output: rawResponse,
                auditId,
                privacyLevel: params.privacyLevel,
            });
            if (!outputCheck.safe) {
                logger.error('LLM output blocked by guardrails', {
                    user_id: params.userId,
                    audit_id: auditId,
                });
                throw new Error('LLM output blocked due to safety concerns');
            }
            finalResponse = outputCheck.sanitized;
            outputWarnings = outputCheck.warnings || [];
            redacted = finalResponse !== rawResponse;
            if (redacted) {
                logger.info('LLM output sanitized', {
                    user_id: params.userId,
                    audit_id: auditId,
                    warnings: outputWarnings,
                });
            }
        }
        const latency = Date.now() - startTime;
        logger.debug('Secured LLM completion successful', {
            user_id: params.userId,
            audit_id: auditId,
            latency_ms: latency,
            redacted,
            guardrails_applied: !params.skipGuardrails,
        });
        return {
            content: finalResponse,
            audit_id: auditId,
            warnings: [...inputWarnings, ...outputWarnings],
            redacted,
            guardrails_applied: !params.skipGuardrails,
        };
    }
    /**
     * Secured chat completion with guardrails
     */
    async chat(params) {
        const startTime = Date.now();
        const provider = this.getProvider();
        const model = params.model || this.getDefaultModel();
        // Emergency bypass check
        if (params.skipGuardrails) {
            logger.warn('GUARDRAILS BYPASSED for chat', {
                user_id: params.userId,
                tenant_id: params.tenantId,
            });
        }
        let processedMessages = params.messages;
        let auditId;
        let inputWarnings = [];
        // Validate each user message in the conversation
        if (!params.skipGuardrails) {
            for (const message of params.messages) {
                if (message.role === 'user') {
                    const inputCheck = await this.guardrails.validateInput({
                        prompt: message.content,
                        userId: params.userId,
                        tenantId: params.tenantId,
                        modelProvider: provider,
                        modelName: model,
                        privacyLevel: params.privacyLevel,
                        applyDifferentialPrivacy: params.applyDifferentialPrivacy,
                    });
                    if (!inputCheck.allowed) {
                        logger.error('Chat message blocked by guardrails', {
                            user_id: params.userId,
                            reason: inputCheck.reason,
                        });
                        throw new Error(`Chat message blocked: ${inputCheck.reason} (risk score: ${inputCheck.risk_score})`);
                    }
                    auditId = inputCheck.audit_id; // Use last audit ID
                    if (inputCheck.warnings) {
                        inputWarnings.push(...inputCheck.warnings);
                    }
                }
            }
        }
        // Call underlying LLM service
        let rawResponse;
        try {
            rawResponse = await this.llmService.chat(processedMessages, {
                model: params.model,
                maxTokens: params.maxTokens,
                temperature: params.temperature,
            });
        }
        catch (error) {
            logger.error('LLM chat failed', {
                user_id: params.userId,
                audit_id: auditId,
                error: error.message,
            });
            throw error;
        }
        // Output validation
        let finalResponse = rawResponse;
        let outputWarnings = [];
        let redacted = false;
        if (!params.skipGuardrails) {
            const outputCheck = await this.guardrails.validateOutput({
                output: rawResponse,
                auditId,
                privacyLevel: params.privacyLevel,
            });
            if (!outputCheck.safe) {
                throw new Error('Chat response blocked due to safety concerns');
            }
            finalResponse = outputCheck.sanitized;
            outputWarnings = outputCheck.warnings || [];
            redacted = finalResponse !== rawResponse;
        }
        const latency = Date.now() - startTime;
        logger.debug('Secured chat completion successful', {
            user_id: params.userId,
            audit_id: auditId,
            latency_ms: latency,
            message_count: params.messages.length,
        });
        return {
            content: finalResponse,
            audit_id: auditId,
            warnings: [...inputWarnings, ...outputWarnings],
            redacted,
            guardrails_applied: !params.skipGuardrails,
        };
    }
    /**
     * Specialized methods with guardrails
     */
    async summarize(params) {
        const systemMessage = `You are a summarization assistant. Summarize the following text concisely${params.maxLength ? ` in no more than ${params.maxLength} words` : ''}.`;
        return this.complete({
            prompt: params.text,
            systemMessage,
            userId: params.userId,
            tenantId: params.tenantId,
            privacyLevel: params.privacyLevel,
            temperature: 0.3,
        });
    }
    async extract(params) {
        const systemMessage = `You are a data extraction assistant. Extract information from the text according to this schema: ${params.schema}. Return only valid JSON.`;
        return this.complete({
            prompt: params.text,
            systemMessage,
            userId: params.userId,
            tenantId: params.tenantId,
            privacyLevel: params.privacyLevel || 'internal',
            temperature: 0.1,
        });
    }
    async questionAnswer(params) {
        const systemMessage = `You are a question-answering assistant. Answer the question based only on the provided context. If the answer is not in the context, say "I don't have enough information to answer that."`;
        const prompt = `Context: ${params.context}\n\nQuestion: ${params.question}`;
        return this.complete({
            prompt,
            systemMessage,
            userId: params.userId,
            tenantId: params.tenantId,
            privacyLevel: params.privacyLevel,
            temperature: 0.2,
        });
    }
    /**
     * GDPR compliance: erase user data
     */
    async eraseUserData(userId) {
        await this.guardrails.eraseUserData(userId);
        logger.info('User LLM data erased', { user_id: userId });
    }
    /**
     * Health check
     */
    getHealth() {
        const guardrailHealth = this.guardrails.getHealth();
        return {
            healthy: guardrailHealth.healthy,
            guardrails: guardrailHealth.checks,
        };
    }
    /**
     * Helper methods
     */
    getProvider() {
        return process.env.LLM_PROVIDER || 'openai';
    }
    getDefaultModel() {
        return process.env.LLM_MODEL || 'gpt-3.5-turbo';
    }
}
exports.SecuredLLMService = SecuredLLMService;
// Export singleton instance
exports.securedLLM = new SecuredLLMService();
// Export class for testing
exports.default = SecuredLLMService;
