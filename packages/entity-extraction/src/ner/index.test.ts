import { NERExtractor } from './index';

describe('NERExtractor', () => {
  let extractor: NERExtractor;

  beforeEach(() => {
    extractor = new NERExtractor();
  });

  describe('extract', () => {
    it('should extract person names with titles', () => {
      const entities = extractor.extract('Dr. John Smith presented the findings.');
      const persons = entities.filter(e => e.type === 'PERSON');
      expect(persons.length).toBeGreaterThan(0);
    });

    it('should extract organizations', () => {
      const entities = extractor.extract('Apple Inc. announced new products.');
      const orgs = entities.filter(e => e.type === 'ORGANIZATION');
      expect(orgs.length).toBeGreaterThan(0);
    });

    it('should extract locations', () => {
      const entities = extractor.extract('The conference was held in New York, NY.');
      const locations = entities.filter(e => e.type === 'LOCATION');
      expect(locations.length).toBeGreaterThan(0);
    });

    it('should extract dates', () => {
      const entities = extractor.extract('The meeting is on January 15, 2024.');
      const dates = entities.filter(e => e.type === 'DATE');
      expect(dates.length).toBeGreaterThan(0);
    });

    it('should extract money amounts', () => {
      const entities = extractor.extract('The price is $1,000,000.');
      const money = entities.filter(e => e.type === 'MONEY');
      expect(money.length).toBeGreaterThan(0);
    });

    it('should extract percentages', () => {
      const entities = extractor.extract('Revenue increased by 25%.');
      const percents = entities.filter(e => e.type === 'PERCENT');
      expect(percents.length).toBeGreaterThan(0);
      expect(percents[0].text).toBe('25%');
    });

    it('should include confidence scores', () => {
      const entities = extractor.extract('Dr. John Smith is here.');
      entities.forEach(entity => {
        expect(typeof entity.confidence).toBe('number');
        expect(entity.confidence).toBeGreaterThanOrEqual(0);
        expect(entity.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should handle empty text', () => {
      const entities = extractor.extract('');
      expect(entities).toEqual([]);
    });

    it('should sort entities by position', () => {
      const entities = extractor.extract('John Smith met Dr. Jane Doe in New York.');
      for (let i = 1; i < entities.length; i++) {
        expect(entities[i].start).toBeGreaterThanOrEqual(entities[i - 1].start);
      }
    });
  });

  describe('extractByType', () => {
    it('should filter entities by type', () => {
      const text = 'Dr. John Smith works at Apple Inc. in New York.';
      const persons = extractor.extractByType(text, 'PERSON');
      persons.forEach(entity => {
        expect(entity.type).toBe('PERSON');
      });
    });
  });

  describe('addCustomPattern', () => {
    it('should extract custom entity types', () => {
      extractor.addCustomPattern('EMAIL', /[\w.-]+@[\w.-]+\.\w+/g);
      const entities = extractor.extract('Contact: test@example.com');
      const custom = entities.filter(e => e.type === 'CUSTOM');
      expect(custom.length).toBeGreaterThan(0);
    });
  });

  describe('confidence thresholding', () => {
    it('should filter by minimum confidence', () => {
      const extractor = new NERExtractor({ minConfidence: 0.9 });
      const entities = extractor.extract('Dr. John Smith is here.');
      entities.forEach(entity => {
        expect(entity.confidence).toBeGreaterThanOrEqual(0.9);
      });
    });
  });
});
