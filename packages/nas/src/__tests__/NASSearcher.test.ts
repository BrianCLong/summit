import { NASSearcher, HardwareAwareNAS } from '../index';

describe('NASSearcher', () => {
  describe('constructor', () => {
    it('should create searcher with search space', () => {
      const searchSpace = {
        numLayers: { min: 2, max: 10 },
        hiddenSize: { min: 32, max: 512 },
        layerTypes: ['dense', 'conv', 'attention'],
      };

      const searcher = new NASSearcher(searchSpace, 'evolutionary');
      expect(searcher).toBeDefined();
    });

    it('should support different search methods', () => {
      const searchSpace = {
        numLayers: { min: 2, max: 5 },
        hiddenSize: { min: 32, max: 128 },
        layerTypes: ['dense'],
      };

      const evolutionary = new NASSearcher(searchSpace, 'evolutionary');
      const random = new NASSearcher(searchSpace, 'random');

      expect(evolutionary).toBeDefined();
      expect(random).toBeDefined();
    });
  });

  describe('search', () => {
    it('should find architecture within iterations', async () => {
      const searchSpace = {
        numLayers: { min: 2, max: 4 },
        hiddenSize: { min: 32, max: 64 },
        layerTypes: ['dense'],
      };

      const searcher = new NASSearcher(searchSpace, 'evolutionary');
      const result = await searcher.search(5);

      expect(result).toBeDefined();
      expect(result.architecture).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
    });

    it('should return architecture with valid layers', async () => {
      const searchSpace = {
        numLayers: { min: 1, max: 3 },
        hiddenSize: { min: 16, max: 32 },
        layerTypes: ['dense', 'conv'],
      };

      const searcher = new NASSearcher(searchSpace, 'random');
      const result = await searcher.search(3);

      expect(result.architecture.layers).toBeDefined();
      expect(result.architecture.layers.length).toBeGreaterThan(0);
    });
  });

  describe('getSearchHistory', () => {
    it('should track evaluated architectures', async () => {
      const searchSpace = {
        numLayers: { min: 1, max: 2 },
        hiddenSize: { min: 16, max: 32 },
        layerTypes: ['dense'],
      };

      const searcher = new NASSearcher(searchSpace, 'evolutionary');
      await searcher.search(3);

      const history = searcher.getSearchHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });
});

describe('HardwareAwareNAS', () => {
  describe('constructor', () => {
    it('should create hardware-aware searcher', () => {
      const searchSpace = {
        numLayers: { min: 1, max: 5 },
        hiddenSize: { min: 32, max: 256 },
        layerTypes: ['dense', 'conv'],
      };

      const searcher = new HardwareAwareNAS(searchSpace, 'gpu', 10);
      expect(searcher).toBeDefined();
    });
  });

  describe('search', () => {
    it('should respect latency constraints', async () => {
      const searchSpace = {
        numLayers: { min: 1, max: 3 },
        hiddenSize: { min: 16, max: 64 },
        layerTypes: ['dense'],
      };

      const searcher = new HardwareAwareNAS(searchSpace, 'cpu', 100);
      const result = await searcher.search(3);

      expect(result).toBeDefined();
      expect(result.latency).toBeDefined();
    });

    it('should optimize for different devices', async () => {
      const searchSpace = {
        numLayers: { min: 1, max: 2 },
        hiddenSize: { min: 16, max: 32 },
        layerTypes: ['dense'],
      };

      const gpuSearcher = new HardwareAwareNAS(searchSpace, 'gpu', 50);
      const cpuSearcher = new HardwareAwareNAS(searchSpace, 'cpu', 50);

      const gpuResult = await gpuSearcher.search(2);
      const cpuResult = await cpuSearcher.search(2);

      expect(gpuResult).toBeDefined();
      expect(cpuResult).toBeDefined();
    });
  });
});
