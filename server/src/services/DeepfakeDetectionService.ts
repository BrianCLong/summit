import LLMService from './LLMService.js';
import VisionService from './VisionService.js';
import logger from '../utils/logger.js';

export interface DeepfakeAnalysisResult {
    isDeepfake: boolean;
    confidence: number;
    riskScore: number;
    markers: string[];
    details: string;
}

export class DeepfakeDetectionService {
    private llmService: LLMService;
    private visionService: VisionService;

    constructor(llmService?: LLMService, visionService?: VisionService) {
        this.llmService = llmService || new LLMService();
        this.visionService = visionService || new VisionService();
    }

    /**
     * Analyze media for synthetic manipulation (deepfakes)
     */
    async analyze(
        contentUri: string,
        mediaType: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'TEXT',
        tenantId: string
    ): Promise<DeepfakeAnalysisResult> {
        logger.info({ message: 'Starting deepfake analysis', mediaType, tenantId });

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
        } catch (error: any) {
            logger.error({ message: 'Deepfake analysis failed', error: error.message, mediaType });
            throw error;
        }
    }

    private async analyzeImage(uri: string, tenantId: string): Promise<DeepfakeAnalysisResult> {
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

    private async analyzeAudio(uri: string, tenantId: string): Promise<DeepfakeAnalysisResult> {
        // Placeholder for audio analysis - in a real system, this would call a specialized signal processor
        const response = await this.llmService.complete(
            `Analyze audio metadata and spectral summary for synthetic voice characteristics: ${uri}`,
            { model: 'gpt-4o', responseFormat: 'json' }
        );
        return this.parseResult(response);
    }

    private async analyzeVideo(uri: string, tenantId: string): Promise<DeepfakeAnalysisResult> {
        // Placeholder for video analysis - would typically involve frame-by-frame or temporal consistency checks
        const response = await this.llmService.complete(
            `Analyze video temporal consistency for deepfake markers (lip-sync, eye-blink frequency): ${uri}`,
            { model: 'gpt-4o', responseFormat: 'json' }
        );
        return this.parseResult(response);
    }

    private async analyzeText(content: string, tenantId: string): Promise<DeepfakeAnalysisResult> {
        const response = await this.llmService.complete(
            `Analyze the following text for signs of LLM generation (hallucination patterns, repetitive structures, lack of contextual grounding): ${content}`,
            { model: 'gpt-4o', responseFormat: 'json' }
        );
        return this.parseResult(response);
    }

    private parseResult(raw: string): DeepfakeAnalysisResult {
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
        } catch (e) {
            logger.warn({ message: 'Failed to parse deepfake analysis JSON', raw });
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
