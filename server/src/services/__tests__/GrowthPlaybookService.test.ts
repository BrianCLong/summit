import { describe, expect, it, jest } from '@jest/globals';
import { GrowthPlaybookService } from '../GrowthPlaybookService.js';

describe('GrowthPlaybookService', () => {
  it('generates a playbook', async () => {
    const service = new GrowthPlaybookService();

    jest.spyOn((service as any).llm, 'complete').mockResolvedValue({
      content: JSON.stringify({
        title: 'Test Playbook',
        summary: 'Test Summary',
        score: 90,
        strengths: ['Strength 1'],
        weaknesses: ['Weakness 1'],
        strategic_initiatives: [],
        tactical_actions: [],
      }),
      usage: { total_tokens: 100 },
    });

    const profile = {
      name: 'Acme Corp',
      industry: 'Tech',
      stage: 'growth' as const,
      employees: 50,
      revenue: 5000000,
      challenges: ['Scale'],
      goals: ['IPO'],
    };

    const result = await service.generatePlaybook(profile);

    expect(result).toBeDefined();
    expect(result.title).toBe('Test Playbook');
    expect(result.score).toBe(90);
  });
});
