import { ModelSelector } from '../core/ModelSelector';

describe('ModelSelector', () => {
  let selector: ModelSelector;

  beforeEach(() => {
    selector = new ModelSelector();
  });

  describe('selectModel', () => {
    it('should select the best model for classification', async () => {
      const data = {
        features: [[1, 2], [3, 4], [5, 6]],
        target: [0, 1, 0],
        taskType: 'classification' as const,
      };

      const result = await selector.selectModel(data);

      expect(result).toBeDefined();
      expect(result.algorithm).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
    });

    it('should select the best model for regression', async () => {
      const data = {
        features: [[1, 2], [3, 4], [5, 6]],
        target: [1.5, 2.5, 3.5],
        taskType: 'regression' as const,
      };

      const result = await selector.selectModel(data);

      expect(result).toBeDefined();
      expect(result.algorithm).toBeDefined();
    });
  });

  describe('getAvailableAlgorithms', () => {
    it('should return classification algorithms', () => {
      const algorithms = selector.getAvailableAlgorithms('classification');

      expect(algorithms.length).toBeGreaterThan(0);
      expect(algorithms).toContain('random_forest');
      expect(algorithms).toContain('xgboost');
    });

    it('should return regression algorithms', () => {
      const algorithms = selector.getAvailableAlgorithms('regression');

      expect(algorithms.length).toBeGreaterThan(0);
    });
  });

  describe('rankModels', () => {
    it('should rank multiple models by performance', async () => {
      const data = {
        features: [[1, 2], [3, 4], [5, 6], [7, 8]],
        target: [0, 1, 0, 1],
        taskType: 'classification' as const,
      };

      const rankings = await selector.rankModels(data, ['random_forest', 'xgboost', 'lightgbm']);

      expect(rankings.length).toBe(3);
      expect(rankings[0].score).toBeGreaterThanOrEqual(rankings[1].score);
    });
  });
});
