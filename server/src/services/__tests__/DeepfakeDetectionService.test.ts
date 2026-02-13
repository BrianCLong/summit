import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { DeepfakeDetectionService } from '../DeepfakeDetectionService.js';

describe('DeepfakeDetectionService', () => {
    let service: any;
    let llmService: any;
    let visionService: any;

    beforeEach(() => {
        llmService = {
            complete: jest.fn()
        };
        visionService = {
            analyzeImage: jest.fn()
        };
        service = new DeepfakeDetectionService(llmService, visionService);
    });

    it('should detect synthetic text', async () => {
        llmService.complete.mockResolvedValue(JSON.stringify({
            isDeepfake: true,
            score: 85,
            riskScore: 85,
            markers: ['repetitive_structure'],
            details: 'Highly repetitive and generic structure consistent with LLM generation.'
        }));

        const result = await service.analyze('This is some synthetic text.', 'TEXT', 'tenant-1');

        expect(result.isDeepfake).toBe(true);
        expect(result.riskScore).toBeGreaterThan(80);
        expect(result.markers).toContain('repetitive_structure');
    });

    it('should analyze images via vision service', async () => {
        visionService.analyzeImage.mockResolvedValue(JSON.stringify({
            isDeepfake: true,
            confidence: 0.9,
            riskScore: 90,
            markers: ['asymmetric_features'],
            details: 'Asymmetric facial features and blurred background artifacts typical of GANs.'
        }));

        const result = await service.analyze('https://example.com/suspect.jpg', 'IMAGE', 'tenant-1');

        expect(result.isDeepfake).toBe(true);
        expect(visionService.analyzeImage).toHaveBeenCalled();
    });

    it('should handle non-deepfake content', async () => {
        llmService.complete.mockResolvedValue(JSON.stringify({
            isDeepfake: false,
            confidence: 0.1,
            riskScore: 10,
            markers: [],
            details: 'Natural variations consistent with human source.'
        }));

        const result = await service.analyze('https://example.com/real_audio.mp3', 'AUDIO', 'tenant-1');

        expect(result.isDeepfake).toBe(false);
        expect(result.riskScore).toBeLessThan(30);
    });
});
