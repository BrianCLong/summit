// @ts-nocheck
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { InfluenceOperationsService } from '../src/services/InfluenceOperationsService.js';
import { CIBDetectionService } from '../src/services/CIBDetectionService.js';
import { NarrativeAnalysisService } from '../src/services/NarrativeAnalysisService.js';

// Mock dependencies
jest.mock('../src/services/CIBDetectionService.js');
jest.mock('../src/services/NarrativeAnalysisService.js');

// Mock GraphAnalyticsService which is a CommonJS module
const mockCalculatePageRank = jest.fn();
const mockCalculateCentralityMeasures = jest.fn();
const mockDetectCommunities = jest.fn();

jest.mock('../src/services/GraphAnalyticsService.js', () => {
  return jest.fn().mockImplementation(() => {
    return {
      calculatePageRank: mockCalculatePageRank,
      calculateCentralityMeasures: mockCalculateCentralityMeasures,
      detectCommunities: mockDetectCommunities,
      calculateBasicMetrics: jest.fn().mockResolvedValue({ nodeCount: 100, edgeCount: 50, avgDegree: 2, density: 0.1, clusteringCoefficient: 0 })
    };
  });
});
jest.mock('../src/services/CrossPlatformAttributionService.js');

// Mock specific method returns for CIBDetectionService
const mockDetectCIB = jest.fn();
(CIBDetectionService as any).mockImplementation(() => {
  return {
    detectCIB: mockDetectCIB
  };
});

// Mock specific method returns for NarrativeAnalysisService
const mockTakeSnapshot = jest.fn();
const mockGetNarrativeEvolution = jest.fn();
(NarrativeAnalysisService as any).mockImplementation(() => {
  return {
    takeSnapshot: mockTakeSnapshot,
    getNarrativeEvolution: mockGetNarrativeEvolution
  };
});


describe('InfluenceOperationsService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();

    // Clear the instance so a new one is created
    (InfluenceOperationsService as any).instance = null;
    service = InfluenceOperationsService.getInstance();
  });

  it('should detect influence operations correctly', async () => {
    const campaignId = 'camp-123';

    mockDetectCIB.mockResolvedValue({
      campaignId: 'camp-123',
      identifiedBotClusters: [],
      anomalies: [],
      precisionScore: 0.88,
      timestamp: new Date()
    });

    mockTakeSnapshot.mockResolvedValue({
      timestamp: new Date(),
      narrativeId: campaignId,
      metrics: { nodeCount: 100 },
      topTopics: [],
      amplificationVelocity: 10
    });

    mockCalculatePageRank.mockResolvedValue([
        { nodeId: 'node1', score: 0.5 }
    ]);

    const result = await service.detectInfluenceOperations(campaignId);

    expect(result).toBeDefined();
    expect(result.cib.precisionScore).toBe(0.88);
    expect(result.narrative.metrics.nodeCount).toBe(100);

    expect(mockCalculatePageRank).toHaveBeenCalledWith(campaignId);

    expect(mockDetectCIB).toHaveBeenCalled();
    expect(mockTakeSnapshot).toHaveBeenCalledWith(campaignId);
  });

  it('should get narrative timeline', async () => {
    const narrativeId = 'narr-1';
    const mockTimeline = [{ timestamp: new Date(), metrics: {} }];
    mockGetNarrativeEvolution.mockResolvedValue(mockTimeline);

    const timeline = await service.getNarrativeTimeline(narrativeId);
    expect(timeline).toBe(mockTimeline);
    expect(mockGetNarrativeEvolution).toHaveBeenCalledWith(narrativeId);
  });

  it('should get influence network', async () => {
    const narrativeId = 'narr-1';
    const mockCentrality = { degreeCentrality: [] };
    const mockCommunities = [{ id: 1, size: 10 }];

    mockCalculateCentralityMeasures.mockResolvedValue(mockCentrality);
    mockDetectCommunities.mockResolvedValue(mockCommunities);

    const network = await service.getInfluenceNetwork(narrativeId);

    expect(network.centrality).toBe(mockCentrality);
    expect(network.communities).toBe(mockCommunities);
  });
});
