const path = require('path');

jest.mock('../../src/services/ExternalAPIService', () => {
  return jest.fn().mockImplementation(() => ({
    providers: () => ({}),
  }));
});

jest.mock('../../src/services/KeyVaultService', () => {
  return jest.fn().mockImplementation(() => ({
    getActiveKey: jest.fn().mockResolvedValue(null),
    addKey: jest.fn(),
  }));
});

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const OSINTFeedService = require('../../src/services/OSINTFeedService');

describe('OSINTFeedService', () => {
  const svc = new OSINTFeedService({
    sourcesFile: path.join(__dirname, '../../../osint-sources.md'),
    configFile: path.join(__dirname, '../../config/osint-feed-config.json'),
  });

  test('loads sources from markdown', () => {
    const sources = svc.loadSources();
    expect(Array.isArray(sources)).toBe(true);
    expect(sources.length).toBeGreaterThan(0);
    expect(sources[0]).toHaveProperty('name');
  });

  test('weights sum to 1', () => {
    const weights = svc.calculateSourceWeights('test subject');
    const total = weights.reduce((a, b) => a + b.weight, 0);
    expect(Math.abs(total - 1)).toBeLessThan(1e-6);
  });

  test('quality influences ranking', () => {
    const weights = svc.calculateSourceWeights('subject');
    const openMeteo = weights.find((w) => w.name === 'Open Meteo Air Quality');
    const gnews = weights.find((w) => w.name === 'GNews');
    expect(openMeteo.weight).toBeGreaterThan(gnews.weight);
  });
});
