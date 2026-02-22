
import { describe, it, expect } from '@jest/globals';
import { ontologyEvolutionService } from '../ontology-evolution-service.js';

describe('Ontology Evolution Drill (Task #112)', () => {
  it('should identify high-frequency custom attributes', async () => {
    const suggestions = await ontologyEvolutionService.analyzeDrift();
    
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].field).toBe('linkedin_url');
    expect(suggestions[0].frequency).toBeGreaterThan(0.8);
  });

  it('should auto-apply promotions with very high confidence', async () => {
    const safePromotion = {
      entityType: 'Person',
      field: 'safe_field',
      frequency: 0.95,
      reason: 'Ubiquitous usage',
      suggestedType: 'string' as const
    };

    const applied = await ontologyEvolutionService.applyPromotion(safePromotion);
    expect(applied).toBe(true);
  });

  it('should require review for lower confidence promotions', async () => {
    const riskyPromotion = {
      entityType: 'Event',
      field: 'maybe_field',
      frequency: 0.60,
      reason: 'Emerging',
      suggestedType: 'string' as const
    };

    const applied = await ontologyEvolutionService.applyPromotion(riskyPromotion);
    expect(applied).toBe(false);
  });
});
