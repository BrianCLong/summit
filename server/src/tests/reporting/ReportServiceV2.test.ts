import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { ReportServiceV2 } from '../../services/reporting/ReportServiceV2.js';

describe('ReportServiceV2', () => {
  let service: ReportServiceV2;

  beforeEach(() => {
    service = new ReportServiceV2();
  });

  describe('createReport', () => {
    it('should block report without citations', async () => {
      const req = {
        title: 'Test',
        sections: [{ title: 'Body', content: 'Claim', type: 'text' as const }],
        citations: [] // Empty
      };

      await expect(service.createReport(req)).rejects.toThrow('BLOCK: Publication blocked');
    });

    it('should generate manifest for valid report', async () => {
      const req = {
        title: 'Test',
        sections: [{ title: 'Body', content: 'Claim', type: 'text' as const }],
        citations: [{ evidenceId: 'ev1', text: 'Proof' }],
        ch: ['H1', 'H2']
      };

      const result = await service.createReport(req);
      expect(result.manifest).toBeDefined();
      expect(result.report.sections.some((s: any) => s.title === 'Analysis of Competing Hypotheses')).toBe(true);
    });
  });
});
