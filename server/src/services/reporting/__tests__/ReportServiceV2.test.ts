import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ReportServiceV2 } from '../ReportServiceV2.js';
import { CitationValidationError } from '../../graphrag/types.js';

describe('ReportServiceV2 citation gate', () => {
  let service: ReportServiceV2;

  beforeEach(() => {
    service = new ReportServiceV2();
    process.env.CITATION_GATE = '1';
  });

  afterEach(() => {
    process.env.CITATION_GATE = undefined;
  });

  it('allows publish when citations present', async () => {
    const result = await service.createReport({
      title: 'Test Report',
      sections: [],
      citations: [{ evidenceId: 'ev-1', text: 'evidence text' }],
    });

    expect(result.report.title).toBe('Test Report');
    expect(result.manifest.evidenceHashes['ev-1']).toBeDefined();
  });

  it('blocks publish with missing citations', async () => {
    await expect(
      service.createReport({
        title: 'Missing citations',
        sections: [],
        citations: [],
      }),
    ).rejects.toBeInstanceOf(CitationValidationError);
  });

  it('blocks publish with unresolved citations', async () => {
    await expect(
      service.createReport({
        title: 'Dangling citations',
        sections: [],
        citations: [{ evidenceId: '', text: '' }],
      }),
    ).rejects.toBeInstanceOf(CitationValidationError);
  });
});
