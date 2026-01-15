import { jest } from '@jest/globals';

export class CIBDetectionService {
  static instance: CIBDetectionService | null = null;

  static getInstance = jest.fn(() => {
    if (!CIBDetectionService.instance) {
      CIBDetectionService.instance = new CIBDetectionService();
    }
    return CIBDetectionService.instance;
  });

  detect = jest.fn().mockResolvedValue({
    detected: false,
    confidence: 0,
    indicators: [],
  });

  detectCIB = jest.fn().mockResolvedValue({
    campaignId: 'mock-campaign',
    identifiedBotClusters: [],
    anomalies: [],
    precisionScore: 0,
    timestamp: new Date(),
  });

  analyze = jest.fn().mockResolvedValue({
    score: 0,
    factors: [],
  });

  getIndicators = jest.fn().mockResolvedValue([]);

  reset = jest.fn();
}

export default CIBDetectionService;
