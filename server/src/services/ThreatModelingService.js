"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.threatModelingService = exports.ThreatModelingService = void 0;
const SecuredLLMService_js_1 = require("./SecuredLLMService.js");
const registry_js_1 = require("../prompts/registry.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class ThreatModelingService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!ThreatModelingService.instance) {
            ThreatModelingService.instance = new ThreatModelingService();
        }
        return ThreatModelingService.instance;
    }
    /**
     * Generates a STRIDE threat model for a given microservice.
     *
     * @param inputs - Details about the microservice to analyze.
     * @param userId - ID of the user requesting the analysis (for audit logs).
     * @param tenantId - Tenant ID (for isolation).
     * @returns A promise resolving to the generated ThreatModel.
     */
    async generateThreatModel(inputs, userId, tenantId) {
        logger_js_1.default.info('Generating threat model', { serviceName: inputs.serviceName, userId, tenantId });
        try {
            // Ensure registry is initialized (idempotent if already done elsewhere, but good safety)
            // Note: promptRegistry.initialize() is async.
            // In a real app, this should be done at startup. We'll assume it's done or do a lazy check if possible.
            // However, registry.ts doesn't show a public initialized flag.
            // We will try to get the prompt, if null, try initializing.
            let promptConfig = registry_js_1.promptRegistry.getPrompt('security.threat-model@v1');
            if (!promptConfig) {
                logger_js_1.default.warn('Prompt not found, attempting to initialize registry');
                await registry_js_1.promptRegistry.initialize();
                promptConfig = registry_js_1.promptRegistry.getPrompt('security.threat-model@v1');
                if (!promptConfig) {
                    throw new Error('Prompt template security.threat-model@v1 not found after initialization');
                }
            }
            const promptText = registry_js_1.promptRegistry.render('security.threat-model@v1', inputs);
            const response = await SecuredLLMService_js_1.securedLLM.complete({
                prompt: promptText,
                userId,
                tenantId,
                privacyLevel: 'internal', // Architectural details are internal
                model: promptConfig.modelConfig.model,
                temperature: promptConfig.modelConfig.temperature,
                maxTokens: promptConfig.modelConfig.maxTokens,
            });
            if (!response.content) {
                throw new Error('Received empty response from LLM');
            }
            // Parse JSON from the response
            // The prompt asks for JSON, but LLMs might wrap it in markdown blocks (```json ... ```)
            // We should strip those if present.
            const jsonString = this.cleanJsonOutput(response.content);
            const threatModel = JSON.parse(jsonString);
            logger_js_1.default.info('Threat model generated successfully', {
                serviceName: inputs.serviceName,
                threatCount: threatModel.threats.length,
                auditId: response.audit_id,
            });
            return threatModel;
        }
        catch (error) {
            logger_js_1.default.error('Failed to generate threat model', {
                serviceName: inputs.serviceName,
                error: error.message,
            });
            throw error;
        }
    }
    cleanJsonOutput(text) {
        // Remove markdown code blocks if present
        let clean = text.trim();
        if (clean.startsWith('```json')) {
            clean = clean.replace(/^```json/, '').replace(/```$/, '');
        }
        else if (clean.startsWith('```')) {
            clean = clean.replace(/^```/, '').replace(/```$/, '');
        }
        return clean.trim();
    }
}
exports.ThreatModelingService = ThreatModelingService;
exports.threatModelingService = ThreatModelingService.getInstance();
