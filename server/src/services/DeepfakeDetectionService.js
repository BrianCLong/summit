"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepfakeDetectionService = void 0;
const LLMService_js_1 = __importDefault(require("./LLMService.js"));
const VisionService_js_1 = __importDefault(require("./VisionService.js"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class DeepfakeDetectionService {
    llmService;
    visionService;
    constructor(llmService, visionService) {
        this.llmService = llmService || new LLMService_js_1.default();
        this.visionService = visionService || new VisionService_js_1.default();
    }
    /**
     * Analyze media for synthetic manipulation (deepfakes)
     */
    async analyze(contentUri, mediaType, tenantId) {
        logger_js_1.default.info({ message: 'Starting deepfake analysis', mediaType, tenantId });
        try {
            let analysisPrompt = '';
            switch (mediaType) {
                case 'IMAGE':
                    return await this.analyzeImage(contentUri, tenantId);
                case 'AUDIO':
                    return await this.analyzeAudio(contentUri, tenantId);
                case 'VIDEO':
                    return await this.analyzeVideo(contentUri, tenantId);
                case 'TEXT':
                    return await this.analyzeText(contentUri, tenantId);
                default:
                    throw new Error(`Unsupported media type for deepfake detection: ${mediaType}`);
            }
        }
        catch (error) {
            logger_js_1.default.error({ message: 'Deepfake analysis failed', error: error.message, mediaType });
            throw error;
        }
    }
    async analyzeImage(uri, tenantId) {
        const prompt = `
            Analyze this image for signs of AI generation or manipulation.
            Look for:
            1. Anatomic inconsistencies (extra fingers, mismatched eyes).
            2. Lighting and shadow anomalies.
            3. Blurred or overly smooth textures in complex areas.
            4. Inconsistent backgrounds or geometric distortions.
            
            Return a JSON object:
            {
                "isDeepfake": boolean,
                "confidence": number (0-1),
                "riskScore": number (0-100),
                "markers": string[],
                "details": string
            }
        `;
        const analysis = await this.visionService.analyzeImage(uri, prompt);
        return this.parseResult(analysis);
    }
    async analyzeAudio(uri, tenantId) {
        // Placeholder for audio analysis - in a real system, this would call a specialized signal processor
        const response = await this.llmService.complete(`Analyze audio metadata and spectral summary for synthetic voice characteristics: ${uri}`, { model: 'gpt-4o', responseFormat: 'json' });
        return this.parseResult(response);
    }
    async analyzeVideo(uri, tenantId) {
        // Placeholder for video analysis - would typically involve frame-by-frame or temporal consistency checks
        const response = await this.llmService.complete(`Analyze video temporal consistency for deepfake markers (lip-sync, eye-blink frequency): ${uri}`, { model: 'gpt-4o', responseFormat: 'json' });
        return this.parseResult(response);
    }
    async analyzeText(content, tenantId) {
        const response = await this.llmService.complete(`Analyze the following text for signs of LLM generation (hallucination patterns, repetitive structures, lack of contextual grounding): ${content}`, { model: 'gpt-4o', responseFormat: 'json' });
        return this.parseResult(response);
    }
    parseResult(raw) {
        try {
            // Scrub markdown if LLM returned it
            const cleanJson = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            return {
                isDeepfake: !!parsed.isDeepfake,
                confidence: parsed.confidence ?? 0.5,
                riskScore: parsed.riskScore ?? 50,
                markers: Array.isArray(parsed.markers) ? parsed.markers : [],
                details: parsed.details ?? 'Analysis completed.'
            };
        }
        catch (e) {
            logger_js_1.default.warn({ message: 'Failed to parse deepfake analysis JSON', raw });
            return {
                isDeepfake: false,
                confidence: 0,
                riskScore: 0,
                markers: ['parsing_error'],
                details: 'Raw output: ' + raw
            };
        }
    }
}
exports.DeepfakeDetectionService = DeepfakeDetectionService;
