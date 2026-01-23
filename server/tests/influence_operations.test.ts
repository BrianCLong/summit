import { describe, it, expect, jest, beforeEach, beforeAll } from '@jest/globals';

const mockDetectCIB = jest.fn();
const mockTakeSnapshot = jest.fn();
const mockGetNarrativeEvolution = jest.fn();
const mockCentrality = jest.fn();
const mockCommunities = jest.fn();
const mockGraphService = {
  centrality: mockCentrality,
  communities: mockCommunities,
};

jest.unstable_mockModule('../src/services/NarrativeAnalysisService.js', () => ({
  NarrativeAnalysisService: jest.fn(() => ({
    takeSnapshot: mockTakeSnapshot,
    getNarrativeEvolution: mockGetNarrativeEvolution,
  })),
}));

jest.unstable_mockModule('../src/services/CIBDetectionService.js', () => {
  class MockCIBDetectionService {
    detectCIB = mockDetectCIB;
  }
  return { CIBDetectionService: MockCIBDetectionService };
});

jest.unstable_mockModule('../src/services/GraphAnalyticsService.js', () => {
  class MockGraphAnalyticsService {
    centrality = mockCentrality;
    communities = mockCommunities;
    static getInstance = jest.fn(() => mockGraphService);
  }
  return {
    __esModule: true,
    default: MockGraphAnalyticsService,
  };
});

jest.unstable_mockModule('../src/services/CrossPlatformAttributionService.js', () => ({
  CrossPlatformAttributionService: jest.fn(),
}));

describe('InfluenceOperationsService', () => {
  let InfluenceOperationsService: typeof import('../src/services/InfluenceOperationsService.js').InfluenceOperationsService;
  let service: InstanceType<typeof InfluenceOperationsService>;
  let NarrativeAnalysisService: jest.Mock;
  let GraphAnalyticsService: { getInstance: jest.Mock };

  beforeAll(async () => {
    ({ InfluenceOperationsService } = await import('../src/services/InfluenceOperationsService.js'));
    ({ NarrativeAnalysisService } = await import('../src/services/NarrativeAnalysisService.js'));
    ({ default: GraphAnalyticsService } = await import('../src/services/GraphAnalyticsService.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Clear the instance so a new one is created
    (InfluenceOperationsService as any).instance = null;
    NarrativeAnalysisService.mockImplementation(() => ({
      takeSnapshot: mockTakeSnapshot,
      getNarrativeEvolution: mockGetNarrativeEvolution,
    }));
    GraphAnalyticsService.getInstance.mockReturnValue(mockGraphService);
    service = InfluenceOperationsService.getInstance();
    (service as any).cibService = { detectCIB: mockDetectCIB };
    (service as any).narrativeService = {
      takeSnapshot: mockTakeSnapshot,
      getNarrativeEvolution: mockGetNarrativeEvolution,
    };
    (service as any).graphService = mockGraphService;
  });

  it('should detect influence operations correctly', async () => {
    const campaignId = 'camp-123';

    mockDetectCIB.mockImplementation(async () => ({
      campaignId: 'camp-123',
      identifiedBotClusters: [],
      anomalies: [],
      precisionScore: 0.88,
      timestamp: new Date()
    }));

    mockTakeSnapshot.mockImplementation(async () => ({
      timestamp: new Date(),
      narrativeId: campaignId,
      metrics: { nodeCount: 100 },
      topTopics: [],
      amplificationVelocity: 10
    }));

    mockCentrality.mockImplementation(async () => [
      { nodeId: 'node1', score: 0.5 },
    ]);

    const result = await service.detectInfluenceOperations(campaignId);

    expect(result).toBeDefined();
    expect(result.cib.precisionScore).toBe(0.88);
    expect(result.narrative.metrics.nodeCount).toBe(100);

    expect(mockCentrality).toHaveBeenCalledWith({
      tenantId: 'system',
      scope: { investigationId: campaignId },
      algorithm: 'pageRank',
    });

    expect(mockDetectCIB).toHaveBeenCalled();
    expect(mockTakeSnapshot).toHaveBeenCalledWith(campaignId);
  });

  it('should get narrative timeline', async () => {
    const narrativeId = 'narr-1';
    const mockTimeline = [{ timestamp: new Date(), metrics: {} }];
    mockGetNarrativeEvolution.mockImplementation(async () => mockTimeline);

    const timeline = await service.getNarrativeTimeline(narrativeId);
    expect(timeline).toBe(mockTimeline);
    expect(mockGetNarrativeEvolution).toHaveBeenCalledWith(narrativeId);
  });

  it('should get influence network', async () => {
    const narrativeId = 'narr-1';
    const mockCentralityResult = { degreeCentrality: [] };
    const mockCommunitiesResult = [{ id: 1, size: 10 }];

    mockCentrality.mockImplementation(async () => mockCentralityResult);
    mockCommunities.mockImplementation(async () => mockCommunitiesResult);

    const network = await service.getInfluenceNetwork(narrativeId);

    expect(network.centrality).toBe(mockCentralityResult);
    expect(network.communities).toBe(mockCommunitiesResult);
  });
});
