
import { jest } from '@jest/globals';
import OSINTAggregator from '../src/services/OSINTAggregator.js';
import SecureFusionService from '../src/services/SecureFusionService.js';
import EmbeddingService from '../src/services/EmbeddingService.js';

// Mock dependencies
jest.mock('../src/utils/logger.js', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

jest.mock('../src/config/database.js', () => ({
  getNeo4jDriver: () => null // Return null to trigger mock resolution in FusionService
}));

// Mock metrics.js to avoid import syntax errors and side effects during test
jest.mock('../src/monitoring/metrics.js', () => ({
  applicationErrors: {
    labels: jest.fn().mockReturnValue({
      inc: jest.fn()
    })
  }
}));

describe('Secure Air-Gapped OSINT Fusion', () => {
  let aggregator: OSINTAggregator;
  let fusionService: SecureFusionService;

  beforeAll(() => {
    process.env.AIR_GAPPED_MODE = 'true';
    process.env.EMBEDDING_DIMENSION = '10'; // Small dimension for test speed
    fusionService = new SecureFusionService({ similarityThreshold: 0.9 });
    aggregator = new OSINTAggregator(fusionService);
  });

  test('Adaptive Prioritization Queue', async () => {
    // Ingest low priority item
    await aggregator.ingest({
      type: 'text',
      text: 'Just a regular weather report.',
      label: 'Weather'
    }, 'public-feed');

    // Ingest high priority item (Keyword 'nuclear')
    await aggregator.ingest({
      type: 'text',
      text: 'Detected potential nuclear movement near border.',
      label: 'Intel Report'
    }, 'intercept-x');

    // Ingest medium priority item (Image)
    await aggregator.ingest({
      type: 'image',
      description: 'Satellite imagery of facility.',
      label: 'SatImg'
    }, 'satellite-feed-alpha');

    // Check Stats
    const stats = aggregator.getStats();
    expect(stats.queueLength).toBe(3);

    // Verify Order (High priority should be first)
    const queue = aggregator.queue;
    expect(queue[0].item.label).toBe('Intel Report'); // "nuclear" + "intercept-x"
    expect(queue[0].score).toBeGreaterThan(queue[1].score);
  });

  test('MoE Fusion Pipeline', async () => {
    // Process the queue
    const results = await aggregator.processQueue(3); // Process all 3

    expect(results.length).toBe(3);

    // Validate High Priority Item Result
    const highPrio = results.find(r => r.item.label === 'Intel Report');
    expect(highPrio?.result.status).toBe('created');
    expect(highPrio?.result.fused).toBe(false);
  });

  test('Entity Resolution (Simulation)', async () => {
    const item1 = { type: 'text', text: 'Target Alpha location verified.', id: 'target-alpha' };
    const res1 = await fusionService.fuse(item1);

    expect(res1.status).toBe('created'); // Based on the mock fallback
    expect(res1.id).toBeDefined();
  });
});
