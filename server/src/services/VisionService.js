"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisionService = void 0;
const LLMService_js_1 = __importDefault(require("./LLMService.js"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class VisionService {
    llmService;
    constructor() {
        this.llmService = new LLMService_js_1.default();
    }
    /**
     * Analyze an image and return a description of entities and relationships
     *
     * @param imageUri - The URI or base64 data of the image
     * @param prompt - Optional custom prompt for analysis
     */
    async analyzeImage(imageUri, prompt) {
        logger_js_1.default.info({ message: 'Analyzing image with vision model', imageUri });
        const systemPrompt = prompt || `
      You are an expert intelligence analyst. 
      Analyze the provided image and describe all relevant entities (People, Organizations, Locations, Equipment) 
      and the relationships between them. 
      Provide a detailed, factual summary that can be used for entity extraction.
    `;
        try {
            // In a real implementation, this would pass the image data to the LLM.
            // LLMService might need update to support vision, or we call the provider directly.
            // For now, we simulate the vision capability if LLMService doesn't support it yet.
            const response = await this.llmService.complete(`[IMAGE_ANALYSIS_REQUEST] ${imageUri}\n\n${systemPrompt}`, {
                model: 'gpt-4o', // Vision-capable model
                temperature: 0.2,
            });
            return response;
        }
        catch (error) {
            logger_js_1.default.error({ message: 'Vision analysis failed', error: error.message, imageUri });
            throw error;
        }
    }
}
exports.VisionService = VisionService;
exports.default = VisionService;
