import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { AdversarialLabService } from '../../services/safety/AdversarialLabService.js';

describe('AdversarialLabService', () => {
  let service: AdversarialLabService;

  beforeEach(() => {
    service = new AdversarialLabService();
  });

  it('should run drill and detect failure', async () => {
    const results = await service.runPromptInjectionDrill('mock-endpoint');
    expect(results.length).toBeGreaterThan(0);
    // At least one probe should "succeed" in simulation (finding a vulnerability)
    // Based on the mock implementation, the DAN probe returns a "bomb" string which triggers detection.
    const danResult = results.find(r => r.probeName.includes('DAN'));
    expect(danResult?.success).toBe(true);
  });
});
