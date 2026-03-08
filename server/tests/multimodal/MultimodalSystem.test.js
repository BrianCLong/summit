"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const AudioSentimentAnalyzer_1 = require("../../src/services/audio/AudioSentimentAnalyzer");
const VisualEmotionAnalyzer_1 = require("../../src/services/vision/VisualEmotionAnalyzer");
const MultimodalSentimentFusion_1 = require("../../src/services/multimodal/MultimodalSentimentFusion");
// Mock dependencies
globals_1.jest.mock('../../src/services/GraphOpsService', () => ({
    expandNeighbors: globals_1.jest.fn(),
    expandNeighborhood: globals_1.jest.fn(),
}));
globals_1.jest.mock('../../src/config/database', () => ({
    getNeo4jDriver: globals_1.jest.fn(() => ({
        session: () => ({
            run: globals_1.jest.fn().mockResolvedValue({ records: [] }),
            close: globals_1.jest.fn().mockResolvedValue(undefined),
        }),
    })),
}));
globals_1.jest.mock('../../src/utils/logger', () => ({
    info: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
}));
(0, globals_1.describe)('Multimodal Sentiment System', () => {
    (0, globals_1.describe)('AudioSentimentAnalyzer', () => {
        let analyzer;
        (0, globals_1.beforeEach)(() => {
            analyzer = new AudioSentimentAnalyzer_1.AudioSentimentAnalyzer();
        });
        (0, globals_1.it)('should extract features from a buffer', async () => {
            const buffer = Buffer.alloc(1024); // Silence
            const features = await analyzer.extractFeatures(buffer);
            (0, globals_1.expect)(features.rms).toBe(0);
            (0, globals_1.expect)(features.zcr).toBe(0);
        });
        (0, globals_1.it)('should classify emotion based on features', async () => {
            const features = {
                rms: 0.8, // High energy
                zcr: 0.1,
                pitch: 500, // High pitch
                spectralCentroid: 1000,
                duration: 1
            };
            const result = await analyzer.classifyEmotion(features);
            // High energy + High pitch -> Happy/Fearful
            (0, globals_1.expect)(result.emotions.fearful + result.emotions.happy).toBeGreaterThan(result.emotions.sad);
        });
    });
    (0, globals_1.describe)('VisualEmotionAnalyzer', () => {
        let analyzer;
        (0, globals_1.beforeEach)(() => {
            analyzer = new VisualEmotionAnalyzer_1.VisualEmotionAnalyzer();
        });
        (0, globals_1.it)('should analyze a frame deterministically', async () => {
            const buffer = Buffer.alloc(100);
            buffer.fill(100); // Gray
            const result = await analyzer.analyzeFrame(buffer);
            (0, globals_1.expect)(result.faces).toBeDefined();
            (0, globals_1.expect)(result.scene).toBeDefined();
            (0, globals_1.expect)(result.bodyLanguage).toBeDefined();
        });
    });
    (0, globals_1.describe)('MultimodalSentimentFusion', () => {
        let fuser;
        (0, globals_1.beforeEach)(() => {
            fuser = new MultimodalSentimentFusion_1.MultimodalSentimentFusion();
        });
        (0, globals_1.it)('should fuse audio and visual results', () => {
            const audioRes = {
                emotions: { neutral: 0.1, happy: 0.8, sad: 0.1, angry: 0, fearful: 0 },
                duration: 1
            };
            const visualRes = {
                faces: [{
                        emotions: { neutral: 0.2, happy: 0.7, sad: 0.1, angry: 0, fearful: 0 }
                    }]
            };
            const result = fuser.fuse(audioRes, visualRes, undefined);
            (0, globals_1.expect)(result.primaryEmotion).toBe('happy');
            (0, globals_1.expect)(result.sentiment.label).toBe('positive');
            (0, globals_1.expect)(result.coherence).toBeGreaterThan(0.8); // High agreement
        });
        (0, globals_1.it)('should handle conflicting modalities', () => {
            const audioRes = {
                emotions: { neutral: 0, happy: 0.9, sad: 0, angry: 0.1, fearful: 0 },
                duration: 1
            };
            // Visual says ANGRY
            const visualRes = {
                faces: [{
                        emotions: { neutral: 0, happy: 0.1, sad: 0, angry: 0.9, fearful: 0 }
                    }]
            };
            const result = fuser.fuse(audioRes, visualRes, undefined);
            // Audio weight 0.35, Visual weight 0.25 -> Audio slightly dominates but result is mixed
            // Actually weights are normalized.
            // Audio (0.35) vs Visual (0.25). Total weight 0.6.
            // Audio norm = 0.58, Visual norm = 0.41.
            // Happy: 0.9 * 0.58 + 0.1 * 0.41 = 0.52 + 0.04 = 0.56
            // Angry: 0.1 * 0.58 + 0.9 * 0.41 = 0.05 + 0.36 = 0.41
            (0, globals_1.expect)(result.primaryEmotion).toBe('happy');
            (0, globals_1.expect)(result.coherence).toBeLessThan(0.6); // Low coherence due to conflict
        });
    });
});
