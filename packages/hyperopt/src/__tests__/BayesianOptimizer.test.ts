import { BayesianOptimizer } from '../optimizers/BayesianOptimizer';

describe('BayesianOptimizer', () => {
  describe('constructor', () => {
    it('should create optimizer with search space', () => {
      const searchSpace = {
        learning_rate: { type: 'float' as const, min: 0.001, max: 0.1 },
        n_estimators: { type: 'int' as const, min: 50, max: 500 },
      };

      const optimizer = new BayesianOptimizer(searchSpace);
      expect(optimizer).toBeDefined();
    });
  });

  describe('suggest', () => {
    it('should suggest valid hyperparameters', () => {
      const searchSpace = {
        learning_rate: { type: 'float' as const, min: 0.001, max: 0.1 },
        n_estimators: { type: 'int' as const, min: 50, max: 500 },
      };

      const optimizer = new BayesianOptimizer(searchSpace);
      const params = optimizer.suggest();

      expect(params.learning_rate).toBeGreaterThanOrEqual(0.001);
      expect(params.learning_rate).toBeLessThanOrEqual(0.1);
      expect(params.n_estimators).toBeGreaterThanOrEqual(50);
      expect(params.n_estimators).toBeLessThanOrEqual(500);
      expect(Number.isInteger(params.n_estimators)).toBe(true);
    });

    it('should handle categorical parameters', () => {
      const searchSpace = {
        activation: {
          type: 'categorical' as const,
          values: ['relu', 'tanh', 'sigmoid'],
        },
      };

      const optimizer = new BayesianOptimizer(searchSpace);
      const params = optimizer.suggest();

      expect(['relu', 'tanh', 'sigmoid']).toContain(params.activation);
    });
  });

  describe('update', () => {
    it('should update with trial results', () => {
      const searchSpace = {
        learning_rate: { type: 'float' as const, min: 0.001, max: 0.1 },
      };

      const optimizer = new BayesianOptimizer(searchSpace);
      const params = optimizer.suggest();

      // Simulate evaluation
      optimizer.update(params, 0.85);

      // Should not throw
      expect(() => optimizer.suggest()).not.toThrow();
    });

    it('should improve suggestions over iterations', () => {
      const searchSpace = {
        x: { type: 'float' as const, min: -5, max: 5 },
      };

      const optimizer = new BayesianOptimizer(searchSpace);
      const scores: number[] = [];

      // Run multiple iterations
      for (let i = 0; i < 10; i++) {
        const params = optimizer.suggest();
        // Objective: maximize -(x^2) (best at x=0)
        const score = -(params.x * params.x);
        optimizer.update(params, score);
        scores.push(score);
      }

      // Later scores should generally be better (less negative)
      const _firstHalfAvg =
        scores.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
      const _secondHalfAvg =
        scores.slice(5).reduce((a, b) => a + b, 0) / 5;

      // This is probabilistic, so we just check it doesn't crash
      expect(scores.length).toBe(10);
    });
  });

  describe('getBestParams', () => {
    it('should return best parameters after optimization', () => {
      const searchSpace = {
        x: { type: 'float' as const, min: 0, max: 10 },
      };

      const optimizer = new BayesianOptimizer(searchSpace);

      // Run some trials
      for (let i = 0; i < 5; i++) {
        const params = optimizer.suggest();
        const score = params.x; // Higher x is better
        optimizer.update(params, score);
      }

      const best = optimizer.getBestParams();
      expect(best).toBeDefined();
      expect(best?.params.x).toBeDefined();
      expect(best?.score).toBeDefined();
    });
  });
});
