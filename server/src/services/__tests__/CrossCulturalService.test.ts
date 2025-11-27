import { CrossCulturalService } from '../CrossCulturalService';

describe('CrossCulturalService', () => {
  let service: CrossCulturalService;

  beforeEach(() => {
    service = new CrossCulturalService();
  });

  describe('analyzeCulturalFit', () => {
    it('should detect taboos', () => {
      const result = service.analyzeCulturalFit('We must impose strict censorship', 'WEST_EUROPE');
      expect(result.flaggedTaboos).toContain('censorship');
      expect(result.culturalFitScore).toBeLessThan(0.5);
    });

    it('should reward value alignment', () => {
      const result = service.analyzeCulturalFit('We value freedom and individuality', 'WEST_EUROPE');
      expect(result.culturalFitScore).toBeGreaterThan(0.5);
    });
  });

  describe('adaptStrategy', () => {
    it('should adapt individualist language for collectivist culture (East Asia)', () => {
      const original = "You must protect your rights";
      const result = service.adaptStrategy(original, 'EAST_ASIA');

      expect(result.adaptedContent).toContain('we should'); // "You must" -> "we should"
      expect(result.adaptedContent).toContain('our community'); // "your rights" -> "our community"
    });

    it('should soften language for high context cultures', () => {
      const original = "Do not believe the lies";
      const result = service.adaptStrategy(original, 'EAST_ASIA');

      expect(result.adaptedContent).toContain('It is unwise to');
    });
  });
});
