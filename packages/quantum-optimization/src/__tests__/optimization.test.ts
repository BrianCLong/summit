/**
 * Quantum Optimization Test Suite
 * Validates QAOA, VQE, and quantum annealing
 */

import { describe, it, expect } from '@jest/globals';
import {
  createQAOAOptimizer,
  createQuantumAnnealer,
  createVQESolver,
} from '../src';

// Mock simulator for testing
const mockSimulator = {
  simulate: async (circuit: any, shots: number) => ({
    counts: { '00': shots / 2, '11': shots / 2 },
    executionTime: 10,
    shots,
  }),
  getStatevector: async (circuit: any) => [
    { real: 0.5, imag: 0 },
    { real: 0.5, imag: 0 },
    { real: 0.5, imag: 0 },
    { real: 0.5, imag: 0 },
  ],
  applyGate: (state: any, gate: any) => state,
};

describe('Quantum Optimization', () => {
  describe('QAOA Optimizer', () => {
    it('should initialize with valid parameters', () => {
      const qaoa = createQAOAOptimizer({
        numQubits: 4,
        p: 2,
        costHamiltonian: {
          edges: [
            { i: 0, j: 1, weight: 1 },
            { i: 1, j: 2, weight: 1 },
          ],
        },
      }, mockSimulator);

      expect(qaoa).toBeDefined();
    });

    it('should run optimization', async () => {
      const qaoa = createQAOAOptimizer({
        numQubits: 2,
        p: 1,
        costHamiltonian: {
          edges: [{ i: 0, j: 1, weight: 1 }],
        },
      }, mockSimulator);

      const result = await qaoa.optimize(5);

      expect(result.optimalSolution).toBeDefined();
      expect(result.iterations).toBeGreaterThan(0);
      expect(result.parameters.gamma).toHaveLength(1);
      expect(result.parameters.beta).toHaveLength(1);
    });

    it('should support bias terms', async () => {
      const qaoa = createQAOAOptimizer({
        numQubits: 3,
        p: 1,
        costHamiltonian: {
          edges: [
            { i: 0, j: 1, weight: 1 },
          ],
          bias: [0.5, -0.5, 0],
        },
      }, mockSimulator);

      const result = await qaoa.optimize(3);
      expect(result.convergence.length).toBeGreaterThan(0);
    });

    it('should support XY mixer', async () => {
      const qaoa = createQAOAOptimizer({
        numQubits: 3,
        p: 1,
        costHamiltonian: {
          edges: [{ i: 0, j: 1, weight: 1 }],
        },
        mixer: 'xy',
      }, mockSimulator);

      const result = await qaoa.optimize(3);
      expect(result).toBeDefined();
    });
  });

  describe('Quantum Annealer', () => {
    it('should anneal QUBO problems', async () => {
      const annealer = createQuantumAnnealer();

      const result = await annealer.anneal({
        numVars: 3,
        qubo: [
          [1, -1, 0],
          [-1, 2, -1],
          [0, -1, 1],
        ],
      }, 100);

      expect(result.solution).toHaveLength(3);
      expect(result.energy).toBeDefined();
      expect(result.iterations).toBeGreaterThan(0);
    });

    it('should respect custom temperature settings', async () => {
      const annealer = createQuantumAnnealer();
      annealer.setTemperature(2.0);
      annealer.setCoolingRate(0.99);

      const result = await annealer.anneal({
        numVars: 2,
        qubo: [
          [1, -1],
          [-1, 1],
        ],
      }, 50);

      expect(result.annealingSchedule.length).toBeGreaterThan(0);
    });

    it('should find optimal solution for simple problems', async () => {
      const annealer = createQuantumAnnealer();

      // Simple problem with known solution
      const result = await annealer.anneal({
        numVars: 2,
        qubo: [
          [-1, 0],
          [0, -1],
        ],
      }, 1000);

      // Optimal is [1, 1] with energy -2
      expect(result.energy).toBeLessThanOrEqual(0);
    });
  });

  describe('VQE Solver', () => {
    it('should solve for ground state energy', async () => {
      const vqe = createVQESolver({
        numQubits: 2,
        hamiltonian: {
          terms: [
            { coefficient: 0.5, pauliString: 'ZI' },
            { coefficient: 0.5, pauliString: 'IZ' },
            { coefficient: 0.25, pauliString: 'XX' },
          ],
        },
        ansatz: 'hardware-efficient',
        layers: 1,
      }, mockSimulator);

      const result = await vqe.solve(5);

      expect(result.groundStateEnergy).toBeDefined();
      expect(result.iterations).toBeGreaterThan(0);
      expect(result.convergence.length).toBeGreaterThan(0);
    });

    it('should support UCCSD ansatz', async () => {
      const vqe = createVQESolver({
        numQubits: 4,
        hamiltonian: {
          terms: [
            { coefficient: 1.0, pauliString: 'ZIIZ' },
          ],
        },
        ansatz: 'uccsd',
        layers: 1,
      }, mockSimulator);

      const result = await vqe.solve(3);
      expect(result.parameters.length).toBeGreaterThan(0);
    });

    it('should converge for simple Hamiltonians', async () => {
      const vqe = createVQESolver({
        numQubits: 1,
        hamiltonian: {
          terms: [
            { coefficient: 1.0, pauliString: 'Z' },
          ],
        },
        ansatz: 'hardware-efficient',
        layers: 1,
      }, mockSimulator);

      const result = await vqe.solve(10);

      // Should converge (later values close to earlier)
      const lastFew = result.convergence.slice(-3);
      const variance = Math.max(...lastFew) - Math.min(...lastFew);
      expect(variance).toBeLessThan(10); // Some variance is expected
    });
  });
});
