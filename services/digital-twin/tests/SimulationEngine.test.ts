import { describe, it, expect } from '@jest/globals';
import { SimulationEngine } from '../src/simulation/SimulationEngine.js';
import type { DigitalTwin } from '../src/types/index.js';

describe('SimulationEngine', () => {
  const engine = new SimulationEngine();

  const mockTwin: DigitalTwin = {
    metadata: {
      id: 'twin-123',
      name: 'Test Twin',
      type: 'SYSTEM',
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test',
      tags: [],
    },
    state: 'ACTIVE',
    currentStateVector: {
      timestamp: new Date(),
      confidence: 0.9,
      source: 'test',
      properties: { value: 100, rate: 0.1 },
    },
    stateHistory: [],
    dataBindings: [],
    relationships: [],
    provenanceChain: [],
  };

  describe('Monte Carlo simulation', () => {
    it('should run Monte Carlo simulation', async () => {
      const result = await engine.runSimulation(mockTwin, {
        twinId: mockTwin.metadata.id,
        config: {
          engine: 'MONTE_CARLO',
          timeHorizon: 10,
          timeStep: 1,
          iterations: 100,
          parameters: { value_volatility: 0.05 },
        },
      });

      expect(result.outcomes).toHaveLength(1);
      expect(result.outcomes[0].scenario).toBe('baseline');
      expect(result.outcomes[0].metrics).toHaveProperty('value_mean');
      expect(result.outcomes[0].metrics).toHaveProperty('value_std');
    });

    it('should support multiple scenarios', async () => {
      const result = await engine.runSimulation(mockTwin, {
        twinId: mockTwin.metadata.id,
        config: {
          engine: 'MONTE_CARLO',
          timeHorizon: 5,
          timeStep: 1,
          iterations: 50,
          parameters: {},
        },
        scenarios: [
          { name: 'optimistic', overrides: { value: 150 } },
          { name: 'pessimistic', overrides: { value: 50 } },
        ],
      });

      expect(result.outcomes).toHaveLength(2);
      expect(result.outcomes[0].scenario).toBe('optimistic');
      expect(result.outcomes[1].scenario).toBe('pessimistic');
    });
  });

  describe('System Dynamics simulation', () => {
    it('should run System Dynamics simulation', async () => {
      const result = await engine.runSimulation(mockTwin, {
        twinId: mockTwin.metadata.id,
        config: {
          engine: 'SYSTEM_DYNAMICS',
          timeHorizon: 10,
          timeStep: 0.5,
          iterations: 1,
          parameters: {
            value_inflow: 5,
            value_outflow: 3,
          },
        },
      });

      expect(result.outcomes).toHaveLength(1);
      expect(result.outcomes[0].stateVector.source).toBe('SYSTEM_DYNAMICS_SIMULATION');
    });
  });

  describe('Hybrid simulation', () => {
    it('should combine Monte Carlo and System Dynamics', async () => {
      const result = await engine.runSimulation(mockTwin, {
        twinId: mockTwin.metadata.id,
        config: {
          engine: 'HYBRID',
          timeHorizon: 5,
          timeStep: 1,
          iterations: 50,
          parameters: {},
        },
      });

      expect(result.outcomes[0].stateVector.source).toBe('HYBRID_SIMULATION');
      expect(result.outcomes[0].stateVector.confidence).toBe(0.9);
    });
  });

  describe('Insights and recommendations', () => {
    it('should generate insights for multi-scenario runs', async () => {
      const result = await engine.runSimulation(mockTwin, {
        twinId: mockTwin.metadata.id,
        config: {
          engine: 'MONTE_CARLO',
          timeHorizon: 5,
          timeStep: 1,
          iterations: 20,
          parameters: {},
        },
        scenarios: [
          { name: 'a', overrides: { value: 100 } },
          { name: 'b', overrides: { value: 200 } },
        ],
      });

      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });
});
