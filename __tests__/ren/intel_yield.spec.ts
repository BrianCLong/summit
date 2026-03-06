import { FactExtractor } from '../../src/agents/ren/extract/facts';
import { YieldScoreCalculator } from '../../src/agents/ren/extract/yield_score';
import { CorroborationEngine } from '../../src/agents/ren/extract/corroborate';

describe('Intelligence Yield Extraction', () => {
  it('should extract facts based on keywords', async () => {
    const extractor = new FactExtractor();
    const facts = await extractor.extractFacts('This document contains technical details.');
    expect(facts.length).toBeGreaterThan(0);
    expect(facts[0].category).toBe('technical');
  });

  it('should calculate yield score correctly', () => {
    const calculator = new YieldScoreCalculator();
    const facts: any[] = [
      { sensitivity: 'high', confidence: 1.0 },
      { sensitivity: 'low', confidence: 0.5 }
    ];
    const score = calculator.calculateScore(facts, []);
    expect(score).toBeCloseTo(0.7 + 0.05);
  });

  it('should find corroboration links', () => {
    const engine = new CorroborationEngine();
    const facts: any[] = [
      { fact_id: '1', category: 'technical' },
      { fact_id: '2', category: 'technical' }
    ];
    const links = engine.findLinks(facts);
    expect(links.length).toBe(1);
    expect(links[0].fact_id).toBe('1');
    expect(links[0].corroborates_fact_id).toBe('2');
  });
});
