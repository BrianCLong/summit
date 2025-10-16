import { DoclingBuildPipeline } from '../docling-build-pipeline';

describe('DoclingBuildPipeline', () => {
  const service = {
    summarizeBuildFailure: jest.fn().mockResolvedValue({
      summary: { id: 's1' },
      fragments: [],
      findings: [],
      policySignals: [],
    }),
    extractLicenses: jest
      .fn()
      .mockResolvedValue({ findings: [], policySignals: [] }),
    generateReleaseNotes: jest
      .fn()
      .mockResolvedValue({ summary: { id: 'rn1' } }),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs all stages when all artifacts provided', async () => {
    const pipeline = new DoclingBuildPipeline(service);
    await pipeline.execute({
      tenantId: 'tenant-x',
      buildId: 'build-1',
      requestId: 'req-12345',
      logText: 'build failed',
      sbomText: 'license: MIT',
      diffText: 'feat: add new feature',
      retention: 'short',
      purpose: 'investigation',
    });

    expect(service.summarizeBuildFailure).toHaveBeenCalled();
    expect(service.extractLicenses).toHaveBeenCalled();
    expect(service.generateReleaseNotes).toHaveBeenCalled();
  });

  it('skips optional stages when artifacts absent', async () => {
    const pipeline = new DoclingBuildPipeline(service);
    await pipeline.execute({
      tenantId: 'tenant-x',
      buildId: 'build-1',
      logText: 'build ok',
      retention: 'standard',
      purpose: 'compliance',
    });

    expect(service.extractLicenses).not.toHaveBeenCalled();
    expect(service.generateReleaseNotes).not.toHaveBeenCalled();
  });
});
