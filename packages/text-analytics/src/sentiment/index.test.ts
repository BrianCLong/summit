import { SentimentAnalyzer } from './index';

describe('SentimentAnalyzer', () => {
  let analyzer: SentimentAnalyzer;

  beforeEach(() => {
    analyzer = new SentimentAnalyzer();
  });

  describe('analyze', () => {
    it('should detect positive sentiment', () => {
      const result = analyzer.analyze('I love this amazing product! It is excellent and wonderful.');
      expect(result.sentiment).toBe('positive');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should detect negative sentiment', () => {
      const result = analyzer.analyze('This is terrible and awful. I hate it completely.');
      expect(result.sentiment).toBe('negative');
      expect(result.score).toBeLessThan(0);
    });

    it('should detect neutral sentiment', () => {
      const result = analyzer.analyze('The meeting will be held at 3pm.');
      expect(result.sentiment).toBe('neutral');
    });

    it('should include confidence score', () => {
      const result = analyzer.analyze('I love this product!');
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle empty text', () => {
      const result = analyzer.analyze('');
      expect(result.sentiment).toBe('neutral');
    });
  });

  describe('analyzeAspects', () => {
    it('should analyze sentiment for specific aspects', () => {
      const text = 'The camera is excellent but the battery is terrible.';
      const aspects = analyzer.analyzeAspects(text, ['camera', 'battery']);

      expect(aspects).toHaveLength(2);

      const camera = aspects.find(a => a.aspect === 'camera');
      const battery = aspects.find(a => a.aspect === 'battery');

      expect(camera).toBeDefined();
      expect(battery).toBeDefined();
    });

    it('should include mentions in aspect results', () => {
      const text = 'The camera is great. I love the camera quality.';
      const aspects = analyzer.analyzeAspects(text, ['camera']);

      expect(aspects[0].mentions.length).toBeGreaterThan(0);
    });
  });

  describe('detectEmotions', () => {
    it('should detect joy in happy text', () => {
      const emotions = analyzer.detectEmotions('I am so happy and delighted today!');
      const joy = emotions.find(e => e.emotion === 'joy');
      expect(joy).toBeDefined();
      expect(joy!.score).toBeGreaterThan(0);
    });

    it('should detect anger', () => {
      const emotions = analyzer.detectEmotions('I am so angry and furious!');
      const anger = emotions.find(e => e.emotion === 'anger');
      expect(anger).toBeDefined();
    });

    it('should detect sadness', () => {
      const emotions = analyzer.detectEmotions('I feel sad and depressed today.');
      const sadness = emotions.find(e => e.emotion === 'sadness');
      expect(sadness).toBeDefined();
    });

    it('should return sorted emotions by score', () => {
      const emotions = analyzer.detectEmotions('I am very happy and a little angry.');
      for (let i = 1; i < emotions.length; i++) {
        expect(emotions[i].score).toBeLessThanOrEqual(emotions[i - 1].score);
      }
    });
  });

  describe('detectSarcasm', () => {
    it('should detect potential sarcasm', () => {
      const result = analyzer.detectSarcasm('Yeah right, that was totally amazing!');
      expect(typeof result.isSarcastic).toBe('boolean');
      expect(typeof result.confidence).toBe('number');
    });

    it('should return confidence between 0 and 1', () => {
      const result = analyzer.detectSarcasm('Sure, obviously this is perfect.');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('trackSentiment', () => {
    it('should track sentiment over time', () => {
      const texts = [
        { text: 'I love this!', timestamp: new Date('2024-01-01') },
        { text: 'This is terrible.', timestamp: new Date('2024-01-02') },
        { text: 'It is okay.', timestamp: new Date('2024-01-03') },
      ];

      const tracked = analyzer.trackSentiment(texts);

      expect(tracked).toHaveLength(3);
      tracked.forEach(item => {
        expect(item.timestamp).toBeDefined();
        expect(item.sentiment).toBeDefined();
      });
    });
  });
});
