"use strict";
// @ts-nocheck
/**
 * Copilot i18n Integration Adapter
 *
 * Provides language detection and translation capabilities for the Copilot service.
 * Ensures that Copilot can handle multilingual queries and responses.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopilotI18nAdapter = void 0;
exports.getCopilotI18nAdapter = getCopilotI18nAdapter;
const translation_service_js_1 = require("../../lib/translation-service.js");
const language_detector_js_1 = require("../../lib/language-detector.js");
const index_js_1 = require("../../../packages/i18n/src/system-messages/index.js");
/**
 * Copilot i18n Adapter
 *
 * Handles language detection and translation for Copilot interactions.
 */
class CopilotI18nAdapter {
    defaultUserLanguage;
    defaultCopilotLanguage;
    constructor(defaultUserLanguage = 'en', defaultCopilotLanguage = 'en') {
        this.defaultUserLanguage = defaultUserLanguage;
        this.defaultCopilotLanguage = defaultCopilotLanguage;
    }
    /**
     * Detect language of user query
     */
    async detectQueryLanguage(query) {
        const detector = (0, language_detector_js_1.getLanguageDetector)();
        const detection = await detector.detect(query);
        return detection.language;
    }
    /**
     * Translate user query to Copilot's language
     *
     * This allows Copilot to process queries in its native language
     * while preserving the user's original language for context.
     */
    async translateUserQuery(message, targetLanguage) {
        const translationService = await (0, translation_service_js_1.getTranslationService)();
        // Detect source language if not provided
        let sourceLanguage = message.language;
        if (!sourceLanguage) {
            sourceLanguage = await this.detectQueryLanguage(message.content);
        }
        const target = targetLanguage || this.defaultCopilotLanguage;
        // Check if translation is needed
        if (sourceLanguage === target) {
            return {
                originalContent: message.content,
                translatedContent: message.content,
                detectedLanguage: sourceLanguage,
                targetLanguage: target,
                wasTranslated: false,
                policyAllowed: true,
            };
        }
        // Translate with policy enforcement
        const context = {
            sourceLanguage,
            targetLanguage: target,
            userId: message.metadata?.userId,
            entityId: message.metadata?.entityId,
            metadata: {
                ...message.metadata,
                purpose: 'copilot_query',
            },
        };
        const result = await translationService.translate(message.content, context);
        return {
            originalContent: message.content,
            translatedContent: result.translatedText,
            detectedLanguage: result.sourceLanguage,
            targetLanguage: result.targetLanguage,
            wasTranslated: result.wasTranslated,
            policyAllowed: result.policyResult.allowed,
            policyReason: result.policyResult.reason,
        };
    }
    /**
     * Translate Copilot response to user's language
     */
    async translateCopilotResponse(response, userLanguage, metadata) {
        const translationService = await (0, translation_service_js_1.getTranslationService)();
        // Copilot responses are typically in the default language
        const sourceLanguage = this.defaultCopilotLanguage;
        // Check if translation is needed
        if (sourceLanguage === userLanguage) {
            return {
                originalContent: response,
                translatedContent: response,
                detectedLanguage: sourceLanguage,
                targetLanguage: userLanguage,
                wasTranslated: false,
                policyAllowed: true,
            };
        }
        // Translate with policy enforcement
        const context = {
            sourceLanguage,
            targetLanguage: userLanguage,
            userId: metadata?.userId,
            entityId: metadata?.entityId,
            metadata: {
                ...metadata,
                purpose: 'copilot_response',
            },
        };
        const result = await translationService.translate(response, context);
        return {
            originalContent: response,
            translatedContent: result.translatedText,
            detectedLanguage: result.sourceLanguage,
            targetLanguage: result.targetLanguage,
            wasTranslated: result.wasTranslated,
            policyAllowed: result.policyResult.allowed,
            policyReason: result.policyResult.reason,
        };
    }
    /**
     * Get localized system message for Copilot
     *
     * Returns appropriate refusal/guardrail messages in user's language
     */
    getLocalizedSystemMessage(messageId, userLanguage, params) {
        // In production, this would use the full i18n system
        // For now, return English message
        // TODO: Integrate with i18n message catalog
        return (0, index_js_1.getSystemMessage)(messageId, params);
    }
    /**
     * Get localized refusal message
     */
    getRefusalMessage(reason, userLanguage) {
        const messageIdMap = {
            harmful: index_js_1.MessageId.COPILOT_REFUSAL_HARMFUL,
            private: index_js_1.MessageId.COPILOT_REFUSAL_PRIVATE,
            policy: index_js_1.MessageId.COPILOT_REFUSAL_POLICY,
        };
        return this.getLocalizedSystemMessage(messageIdMap[reason], userLanguage);
    }
    /**
     * Get localized guardrail message
     */
    getGuardrailMessage(type, userLanguage) {
        const messageIdMap = {
            classification: index_js_1.MessageId.COPILOT_GUARDRAIL_CLASSIFICATION,
            sensitive: index_js_1.MessageId.COPILOT_GUARDRAIL_SENSITIVE,
        };
        return this.getLocalizedSystemMessage(messageIdMap[type], userLanguage);
    }
    /**
     * Handle multilingual conversation flow
     *
     * This orchestrates the full translation flow:
     * 1. Detect user query language
     * 2. Translate query to Copilot language if needed
     * 3. Process with Copilot (external)
     * 4. Translate response back to user language
     */
    async handleMultilingualConversation(userQuery, copilotResponseGenerator, userLanguage) {
        // Detect user language if not provided
        const detectedLanguage = userLanguage || await this.detectQueryLanguage(userQuery.content);
        // Translate query to Copilot language
        const translatedQuery = await this.translateUserQuery(userQuery, this.defaultCopilotLanguage);
        // Generate Copilot response (in Copilot's language)
        const copilotResponse = await copilotResponseGenerator(translatedQuery.translatedContent);
        // Translate response back to user language
        const translatedResponse = await this.translateCopilotResponse(copilotResponse, detectedLanguage, userQuery.metadata);
        return {
            query: translatedQuery,
            response: translatedResponse,
            userLanguage: detectedLanguage,
        };
    }
}
exports.CopilotI18nAdapter = CopilotI18nAdapter;
/**
 * Singleton instance
 */
let adapterInstance = null;
/**
 * Get Copilot i18n adapter instance
 */
function getCopilotI18nAdapter(defaultUserLanguage, defaultCopilotLanguage) {
    if (!adapterInstance) {
        adapterInstance = new CopilotI18nAdapter(defaultUserLanguage, defaultCopilotLanguage);
    }
    return adapterInstance;
}
