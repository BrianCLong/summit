import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { InfluenceOperationsService } from '../src/services/InfluenceOperationsService.js';
import { CIBDetectionService } from '../src/services/CIBDetectionService.js';
import { NarrativeAnalysisService } from '../src/services/NarrativeAnalysisService.js';
import Neo4jGraphAnalyticsService from '../src/services/GraphAnalyticsService.js';

// Mock dependencies
jest.mock('../src/services/CIBDetectionService.js');
jest.mock('../src/services/NarrativeAnalysisService.js');

const mockCentrality = jest.fn();
const mockCommunities = jest.fn();
const mockGraphService = {
  centrality: mockCentrality,
  communities: mockCommunities,
};

jest.mock('../src/services/GraphAnalyticsService.js', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => mockGraphService),
  },
}));
jest.mock('../src/services/CrossPlatformAttributionService.js');

// Mock specific method returns for CIBDetectionService
const mockDetectCIB = jest.fn();

// Mock specific method returns for NarrativeAnalysisService
const mockTakeSnapshot = jest.fn();
const mockGetNarrativeEvolution = jest.fn();


describe('InfluenceOperationsService', () => {
  let service: InfluenceOperationsService;

  beforeEach(() => {
    jest.clearAllMocks();

    (Neo4jGraphAnalyticsService as any).getInstance = jest
      .fn()
      .mockReturnValue(mockGraphService);
    (CIBDetectionService as any).mockImplementation(() => {
      return {
        detectCIB: mockDetectCIB,
      };
    });
    (NarrativeAnalysisService as any).mockImplementation(() => {
      return {
        takeSnapshot: mockTakeSnapshot,
        getNarrativeEvolution: mockGetNarrativeEvolution,
      };
    });

    // Clear the instance so a new one is created
    (InfluenceOperationsService as any).instance = null;
    service = InfluenceOperationsService.getInstance();
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
