import LLMService from './LLMService.js';
import logger from '../utils/logger.js';

export class VisionService {
    private llmService: LLMService;

    constructor() {
        this.llmService = new LLMService();
    }

    /**
     * Analyze an image and return a description of entities and relationships
     * 
     * @param imageUri - The URI or base64 data of the image
     * @param prompt - Optional custom prompt for analysis
     */
    async analyzeImage(imageUri: string, prompt?: string): Promise<string> {
        logger.info({ message: 'Analyzing image with vision model', imageUri });

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

            const response = await this.llmService.complete(
                `[IMAGE_ANALYSIS_REQUEST] ${imageUri}\n\n${systemPrompt}`,
                {
                    model: 'gpt-4o', // Vision-capable model
                    temperature: 0.2,
                }
            );

            return response;
        } catch (error: any) {
            logger.error({ message: 'Vision analysis failed', error: error.message, imageUri });
            throw error;
        }
    }
}

export default VisionService;
