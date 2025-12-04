import { AudioSentimentAnalyzer } from '../../src/services/audio/AudioSentimentAnalyzer';
import { VisualEmotionAnalyzer } from '../../src/services/vision/VisualEmotionAnalyzer';
import { MultimodalSentimentFusion } from '../../src/services/multimodal/MultimodalSentimentFusion';

// Mock dependencies
jest.mock('../../src/services/GraphOpsService', () => ({
  expandNeighbors: jest.fn(),
  expandNeighborhood: jest.fn(),
}));

jest.mock('../../src/config/database', () => ({
  getNeo4jDriver: jest.fn(() => ({
    session: () => ({
      run: jest.fn().mockResolvedValue({ records: [] }),
      close: jest.fn().mockResolvedValue(undefined),
    }),
  })),
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe('Multimodal Sentiment System', () => {

  describe('AudioSentimentAnalyzer', () => {
    let analyzer: AudioSentimentAnalyzer;

    beforeEach(() => {
      analyzer = new AudioSentimentAnalyzer();
    });

    it('should extract features from a buffer', async () => {
      const buffer = Buffer.alloc(1024); // Silence
      const features = await analyzer.extractFeatures(buffer);

      expect(features.rms).toBe(0);
      expect(features.zcr).toBe(0);
    });

    it('should classify emotion based on features', async () => {
      const features = {
        rms: 0.8, // High energy
        zcr: 0.1,
        pitch: 500, // High pitch
        spectralCentroid: 1000,
        duration: 1
      };

      const result = await analyzer.classifyEmotion(features);
      // High energy + High pitch -> Happy/Fearful
      expect(result.emotions.fearful + result.emotions.happy).toBeGreaterThan(result.emotions.sad);
    });
  });

  describe('VisualEmotionAnalyzer', () => {
    let analyzer: VisualEmotionAnalyzer;

    beforeEach(() => {
      analyzer = new VisualEmotionAnalyzer();
    });

    it('should analyze a frame deterministically', async () => {
      const buffer = Buffer.alloc(100);
      buffer.fill(100); // Gray

      const result = await analyzer.analyzeFrame(buffer);

      expect(result.faces).toBeDefined();
      expect(result.scene).toBeDefined();
      expect(result.bodyLanguage).toBeDefined();
    });
  });

  describe('MultimodalSentimentFusion', () => {
    let fuser: MultimodalSentimentFusion;

    beforeEach(() => {
      fuser = new MultimodalSentimentFusion();
    });

    it('should fuse audio and visual results', () => {
      const audioRes: any = {
        emotions: { neutral: 0.1, happy: 0.8, sad: 0.1, angry: 0, fearful: 0 },
        duration: 1
      };

      const visualRes: any = {
        faces: [{
          emotions: { neutral: 0.2, happy: 0.7, sad: 0.1, angry: 0, fearful: 0 }
        }]
      };

      const result = fuser.fuse(audioRes, visualRes, undefined);

      expect(result.primaryEmotion).toBe('happy');
      expect(result.sentiment.label).toBe('positive');
      expect(result.coherence).toBeGreaterThan(0.8); // High agreement
    });

    it('should handle conflicting modalities', () => {
      const audioRes: any = {
        emotions: { neutral: 0, happy: 0.9, sad: 0, angry: 0.1, fearful: 0 },
        duration: 1
      };

      // Visual says ANGRY
      const visualRes: any = {
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

      expect(result.primaryEmotion).toBe('happy');
      expect(result.coherence).toBeLessThan(0.6); // Low coherence due to conflict
    });
  });
});
