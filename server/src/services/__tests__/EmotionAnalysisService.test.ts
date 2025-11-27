import { EmotionAnalysisService } from '../EmotionAnalysisService';

describe('EmotionAnalysisService', () => {
  let service: EmotionAnalysisService;

  beforeEach(() => {
    service = new EmotionAnalysisService();
  });

  describe('detectEmotionalFraming', () => {
    it('should detect FEAR', () => {
      const text = "We are in grave danger. The threat is deadly and we should be afraid.";
      const result = service.detectEmotionalFraming(text);
      expect(result.dominant).toBe('FEAR');
      expect(result.fear).toBeGreaterThan(0.2);
    });

    it('should detect HOPE', () => {
      const text = "We must believe in a bright future. Optimistic solutions will inspire us to build.";
      const result = service.detectEmotionalFraming(text);
      expect(result.dominant).toBe('HOPE');
      expect(result.hope).toBeGreaterThan(0.2);
    });

    it('should detect ANGER', () => {
      const text = "This is an outrage! The corrupt enemy has stolen our rights. We must fight!";
      const result = service.detectEmotionalFraming(text);
      expect(result.dominant).toBe('ANGER');
      expect(result.anger).toBeGreaterThan(0.2);
    });

    it('should detect PRIDE', () => {
      const text = "Our heritage is our glory. Stand united with honor and pride for our victory.";
      const result = service.detectEmotionalFraming(text);
      expect(result.dominant).toBe('PRIDE');
      expect(result.pride).toBeGreaterThan(0.2);
    });

    it('should be NEUTRAL for plain text', () => {
      const text = "The table is made of wood. It is located in the dining room.";
      const result = service.detectEmotionalFraming(text);
      expect(result.dominant).toBe('NEUTRAL');
    });
  });

  describe('Correlation Analysis', () => {
    it('should calculate positive correlation', () => {
      // Inject data where High Fear = High Shares
      service.trackEngagement("danger threat panic", { shares: 100, likes: 0, views: 0, comments: 0 });
      service.trackEngagement("danger threat panic", { shares: 90, likes: 0, views: 0, comments: 0 });
      service.trackEngagement("hello world", { shares: 10, likes: 0, views: 0, comments: 0 });
      service.trackEngagement("hello world", { shares: 5, likes: 0, views: 0, comments: 0 });

      const corr = service.getCorrelation('fear', 'shares');
      expect(corr.correlationCoefficient).toBeGreaterThan(0.8);
    });

    it('should handle empty data gracefully', () => {
      const corr = service.getCorrelation('fear', 'shares');
      expect(corr.correlationCoefficient).toBe(0);
      expect(corr.sampleSize).toBe(0);
    });
  });
});
