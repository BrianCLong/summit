import { GrowthPlaybookService } from '../GrowthPlaybookService';

// Mock LLMService
jest.mock('../LLMService.js', () => {
  return class MockLLMService {
    constructor() {}
    async complete() {
      return {
        content: JSON.stringify({
          title: "Test Playbook",
          summary: "Test Summary",
          score: 90,
          strengths: ["Strength 1"],
          weaknesses: ["Weakness 1"],
          strategic_initiatives: [],
          tactical_actions: []
        }),
        usage: { total_tokens: 100 }
      };
    }
  };
});

describe('GrowthPlaybookService', () => {
  let service: GrowthPlaybookService;

  beforeEach(() => {
    service = new GrowthPlaybookService();
  });

  it('should generate a playbook', async () => {
    const profile = {
      name: 'Acme Corp',
      industry: 'Tech',
      stage: 'growth' as const,
      employees: 50,
      revenue: 5000000,
      challenges: ['Scale'],
      goals: ['IPO']
    };

    const result = await service.generatePlaybook(profile);

    expect(result).toBeDefined();
    expect(result.title).toBe('Test Playbook');
    expect(result.score).toBe(90);
  });
});
