import CompanyOSPatentService, {
  CompanyOSPatentServiceOptions,
  IPAsset,
  PatentDataProvider,
  PatentMatch,
  PatentRecord,
  PatentSearchParams,
} from '../../services/CompanyOSPatentService';

class FakePatentProvider implements PatentDataProvider {
  public lastSearch?: PatentSearchParams;

  constructor(private readonly results: PatentRecord[]) {}

  async searchPatents(params: PatentSearchParams): Promise<PatentRecord[]> {
    this.lastSearch = params;
    return this.results;
  }

  async getPatent(patentId: string): Promise<PatentRecord | null> {
    return this.results.find((record) => record.patentId === patentId) ?? null;
  }
}

describe('CompanyOSPatentService', () => {
  const patentA: PatentRecord = {
    patentId: 'US123456',
    title: 'Quantum Edge Inference Engine',
    abstract:
      'A system for orchestrating quantum-enhanced inference over enterprise knowledge graphs with adaptive policy controls.',
    claims: [
      'A quantum edge accelerator that orchestrates graph inference pipelines.',
      'The method of claim 1 wherein workloads are routed using topology-aware scheduling.',
      'The system of claim 1 further comprising automated policy compliance scoring.',
    ],
    assignee: 'Competitor Labs',
    filingDate: '2024-03-18',
    jurisdiction: 'US',
    classifications: ['G06N'],
    citations: ['US987654'],
  };

  const patentB: PatentRecord = {
    patentId: 'US654321',
    title: 'Edge Data Synchronization Appliance',
    abstract: 'Techniques for synchronizing streaming data pipelines across multi-cloud deployments.',
    claims: [
      'A synchronization engine that batches log streams before transmission.',
      'The method of claim 1 wherein conflict resolution uses vector clocks.',
    ],
    assignee: 'Legacy Systems Inc',
    filingDate: '2022-06-02',
    jurisdiction: 'CA',
    classifications: ['G06F'],
    citations: [],
  };

  const defaultAsset: IPAsset = {
    id: 'asset-1',
    title: 'Quantum Edge Accelerator for CompanyOS',
    description:
      'CompanyOS module that coordinates quantum inference workloads across distributed knowledge graphs with inline compliance analytics.',
    claims: [
      'A quantum edge accelerator that orchestrates graph inference pipelines.',
      'A policy aware scheduler that tunes workloads across federated CompanyOS deployments.',
      'Adaptive compliance scoring for every inference execution.',
    ],
    keywords: ['quantum', 'graph', 'accelerator', 'scheduler'],
    technologyArea: 'enterprise',
    maturity: 'prototype',
    documents: [
      {
        name: 'design-review.md',
        content: '# Design Review\nQuantum accelerator architecture and compliance integration details.',
        type: 'text/markdown',
      },
    ],
  };

  const createService = (provider: PatentDataProvider, options?: Partial<CompanyOSPatentServiceOptions>) =>
    new CompanyOSPatentService({ provider, similarityThreshold: 0.1, maxResults: 5, ...options });

  it('scans assets and ranks patent matches by similarity and risk', async () => {
    const provider = new FakePatentProvider([patentA, patentB]);
    const service = createService(provider);

    const matches = await service.scanIntellectualProperty(defaultAsset);

    expect(provider.lastSearch?.keywords).toEqual(
      expect.arrayContaining(['quantum', 'graph', 'accelerator']),
    );
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].record.patentId).toBe('US123456');
    expect(matches[0].riskLevel).toBe('HIGH');
    expect(matches[0].overlappingClaims.length).toBeGreaterThan(0);
    expect(matches.every((match) => match.similarityScore >= 0.1)).toBe(true);
    expect(matches[0].keywordScore).toBeGreaterThan(0);
    expect(matches[0].claimOverlapScore).toBeGreaterThan(0);
    expect(matches[0].recencyScore).toBeGreaterThan(0);
    expect(Array.isArray(matches[0].noveltyGaps)).toBe(true);
  });

  it('prepares a patent filing draft with references and novelty guidance', async () => {
    const provider = new FakePatentProvider([patentA, patentB]);
    const service = createService(provider);

    const matches = await service.scanIntellectualProperty(defaultAsset);
    const draft = await service.preparePatentFiling(defaultAsset, matches);

    expect(draft.assetId).toBe(defaultAsset.id);
    expect(draft.references).toContain('US123456');
    expect(draft.summary).toContain('Asset "Quantum Edge Accelerator for CompanyOS" focuses on');
    expect(draft.noveltyStatement).toContain('Core claims emphasize');
    expect(draft.jurisdictions).toContain('US');
    expect(draft.risks.map((match) => match.record.patentId)).toEqual(
      matches.map((match) => match.record.patentId),
    );
    expect(draft.claimGaps.length).toBeGreaterThanOrEqual(0);
    expect(draft.differentiationStrategies.length).toBeGreaterThan(0);
    expect(draft.recommendedActions.length).toBeGreaterThan(0);
  });

  it('adds default jurisdictions for defense assets even without matches', async () => {
    const provider = new FakePatentProvider([]);
    const service = createService(provider);
    const defenseAsset: IPAsset = {
      ...defaultAsset,
      id: 'asset-defense',
      technologyArea: 'defense',
      maturity: 'concept',
      documents: [],
    };

    const draft = await service.preparePatentFiling(defenseAsset, [] as PatentMatch[]);

    expect(draft.jurisdictions).toEqual(expect.arrayContaining(['US', 'EU']));
    expect(draft.references).toHaveLength(0);
    expect(draft.summary).toContain('Asset "Quantum Edge Accelerator for CompanyOS" focuses on');
    expect(draft.recommendedActions).toContain(
      'Proceed with accelerated filing timeline leveraging clear white-space confirmation.',
    );
  });

  it('identifies claim gaps when prior art overlaps are limited', async () => {
    const provider = new FakePatentProvider([patentB]);
    const service = createService(provider);

    const matches = await service.scanIntellectualProperty(defaultAsset);
    const draft = await service.preparePatentFiling(defaultAsset, matches);

    expect(matches[0].riskLevel === 'LOW' || matches[0].riskLevel === 'MEDIUM').toBe(true);
    expect(draft.claimGaps.length).toBeGreaterThan(0);
    expect(matches[0].noveltyGaps.length).toBeGreaterThan(0);
  });
});
