/**
 * Quantum Simulation Test Suite
 * Validates quantum circuit simulation
 */

import { describe, it, expect } from '@jest/globals';
import {
  createCircuit,
  createStatevectorSimulator,
  createLocalBackend,
  GateType,
} from '../src';

describe('Quantum Simulation', () => {
  describe('Circuit Builder', () => {
    it('should create empty circuit', () => {
      const circuit = createCircuit(3).build();

      expect(circuit.numQubits).toBe(3);
      expect(circuit.gates).toHaveLength(0);
    });

    it('should add single-qubit gates', () => {
      const circuit = createCircuit(2)
        .h(0)
        .x(1)
        .y(0)
        .z(1)
        .build();

      expect(circuit.gates).toHaveLength(4);
    });

    it('should add two-qubit gates', () => {
      const circuit = createCircuit(2)
        .cnot(0, 1)
        .cz(0, 1)
        .swap(0, 1)
        .build();

      expect(circuit.gates).toHaveLength(3);
    });

    it('should add rotation gates with parameters', () => {
      const circuit = createCircuit(1)
        .rx(0, Math.PI / 4)
        .ry(0, Math.PI / 2)
        .rz(0, Math.PI)
        .build();

      expect(circuit.gates).toHaveLength(3);
      expect(circuit.gates[0].parameters).toEqual([Math.PI / 4]);
    });

    it('should validate qubit indices', () => {
      expect(() => createCircuit(2).h(5)).toThrow();
      expect(() => createCircuit(2).cnot(0, 0)).toThrow();
    });

    it('should create Bell state', () => {
      const circuit = createCircuit(2)
        .createBellState(0, 1)
        .build();

      expect(circuit.gates).toHaveLength(2);
      expect(circuit.gates[0].type).toBe(GateType.HADAMARD);
      expect(circuit.gates[1].type).toBe(GateType.CNOT);
    });

    it('should create GHZ state', () => {
      const circuit = createCircuit(4)
        .createGHZState([0, 1, 2, 3])
        .build();

      expect(circuit.gates).toHaveLength(4); // 1 H + 3 CNOT
    });

    it('should apply QFT', () => {
      const circuit = createCircuit(3)
        .qft([0, 1, 2])
        .build();

      expect(circuit.gates.length).toBeGreaterThan(0);
    });

    it('should add measurements', () => {
      const circuit = createCircuit(3)
        .h(0)
        .measure()
        .build();

      expect(circuit.measurements).toEqual([0, 1, 2]);
    });
  });

  describe('Statevector Simulator', () => {
    it('should simulate identity circuit', async () => {
      const simulator = createStatevectorSimulator();
      const circuit = createCircuit(2).measure().build();

      const result = await simulator.simulate(circuit, 1000);

      expect(result.counts['00']).toBe(1000);
    });

    it('should simulate Bell state', async () => {
      const simulator = createStatevectorSimulator();
      const circuit = createCircuit(2)
        .createBellState(0, 1)
        .measure()
        .build();

      const result = await simulator.simulate(circuit, 1000);

      // Bell state should produce |00> and |11> with equal probability
      expect(result.counts['00'] || 0).toBeGreaterThan(400);
      expect(result.counts['11'] || 0).toBeGreaterThan(400);
      expect(result.counts['01'] || 0).toBeLessThan(100);
      expect(result.counts['10'] || 0).toBeLessThan(100);
    });

    it('should get statevector', async () => {
      const simulator = createStatevectorSimulator();
      const circuit = createCircuit(1).h(0).build();

      const statevector = await simulator.getStatevector(circuit);

      expect(statevector.length).toBe(2);
      // |+> state: (|0> + |1>) / sqrt(2)
      expect(Math.abs(statevector[0].real - 1 / Math.sqrt(2))).toBeLessThan(0.01);
      expect(Math.abs(statevector[1].real - 1 / Math.sqrt(2))).toBeLessThan(0.01);
    });

    it('should report execution time', async () => {
      const simulator = createStatevectorSimulator();
      const circuit = createCircuit(3).h(0).cnot(0, 1).cnot(1, 2).measure().build();

      const result = await simulator.simulate(circuit, 100);

      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.shots).toBe(100);
    });
  });

  describe('Local Backend', () => {
    it('should submit and get job status', async () => {
      const backend = createLocalBackend();
      const circuit = createCircuit(2).h(0).cnot(0, 1).measure().build();

      const jobId = await backend.submit(circuit);

      expect(jobId).toBeDefined();
      expect(jobId.startsWith('job-')).toBe(true);

      // Wait for job to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = await backend.getStatus(jobId);
      expect(['queued', 'running', 'completed']).toContain(status);
    });

    it('should return supported gates', () => {
      const backend = createLocalBackend();

      expect(backend.supportedGates).toContain(GateType.HADAMARD);
      expect(backend.supportedGates).toContain(GateType.CNOT);
      expect(backend.maxQubits).toBeGreaterThanOrEqual(20);
    });
  });
});
