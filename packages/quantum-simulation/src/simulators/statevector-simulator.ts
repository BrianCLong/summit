/**
 * Statevector Quantum Simulator
 * Simulates quantum circuits using statevector representation
 */

import { Complex, QuantumState, QuantumCircuit, QuantumGate, QuantumSimulator, SimulationResult, GateType } from '../types';

export class StatevectorSimulator implements QuantumSimulator {
  async simulate(circuit: QuantumCircuit, shots: number = 1024): Promise<SimulationResult> {
    const startTime = performance.now();

    // Get final statevector
    const statevector = await this.getStatevector(circuit);

    // Perform measurements
    const counts = this.measureStatevector(statevector, circuit.numQubits, shots);

    const executionTime = performance.now() - startTime;

    return {
      counts,
      statevector,
      executionTime,
      shots,
    };
  }

  async getStatevector(circuit: QuantumCircuit): Promise<QuantumState> {
    // Initialize state to |0...0>
    let state = this.initializeState(circuit.numQubits);

    // Apply gates sequentially
    for (const gate of circuit.gates) {
      state = this.applyGate(state, gate);
    }

    return state;
  }

  applyGate(state: QuantumState, gate: QuantumGate): QuantumState {
    switch (gate.type) {
      case GateType.IDENTITY:
        return state;
      case GateType.PAULI_X:
        return this.applyPauliX(state, gate.qubits[0]);
      case GateType.PAULI_Y:
        return this.applyPauliY(state, gate.qubits[0]);
      case GateType.PAULI_Z:
        return this.applyPauliZ(state, gate.qubits[0]);
      case GateType.HADAMARD:
        return this.applyHadamard(state, gate.qubits[0]);
      case GateType.PHASE:
        return this.applyPhase(state, gate.qubits[0]);
      case GateType.T_GATE:
        return this.applyT(state, gate.qubits[0]);
      case GateType.RX:
        return this.applyRX(state, gate.qubits[0], gate.parameters![0]);
      case GateType.RY:
        return this.applyRY(state, gate.qubits[0], gate.parameters![0]);
      case GateType.RZ:
        return this.applyRZ(state, gate.qubits[0], gate.parameters![0]);
      case GateType.CNOT:
        return this.applyCNOT(state, gate.qubits[0], gate.qubits[1]);
      case GateType.CZ:
        return this.applyCZ(state, gate.qubits[0], gate.qubits[1]);
      case GateType.SWAP:
        return this.applySWAP(state, gate.qubits[0], gate.qubits[1]);
      default:
        throw new Error(`Unsupported gate type: ${gate.type}`);
    }
  }

  private initializeState(numQubits: number): QuantumState {
    const size = 2 ** numQubits;
    const state: QuantumState = new Array(size).fill(null).map(() => ({ real: 0, imag: 0 }));
    state[0] = { real: 1, imag: 0 }; // |0...0>
    return state;
  }

  private applyPauliX(state: QuantumState, qubit: number): QuantumState {
    const numQubits = Math.log2(state.length);
    const newState = [...state];

    for (let i = 0; i < state.length; i++) {
      const bit = (i >> qubit) & 1;
      if (bit === 0) {
        const j = i | (1 << qubit);
        [newState[i], newState[j]] = [newState[j], newState[i]];
      }
    }

    return newState;
  }

  private applyPauliY(state: QuantumState, qubit: number): QuantumState {
    const newState = [...state];

    for (let i = 0; i < state.length; i++) {
      const bit = (i >> qubit) & 1;
      if (bit === 0) {
        const j = i | (1 << qubit);
        const temp = newState[i];
        newState[i] = { real: newState[j].imag, imag: -newState[j].real };
        newState[j] = { real: -temp.imag, imag: temp.real };
      }
    }

    return newState;
  }

  private applyPauliZ(state: QuantumState, qubit: number): QuantumState {
    const newState = [...state];

    for (let i = 0; i < state.length; i++) {
      const bit = (i >> qubit) & 1;
      if (bit === 1) {
        newState[i] = { real: -newState[i].real, imag: -newState[i].imag };
      }
    }

    return newState;
  }

  private applyHadamard(state: QuantumState, qubit: number): QuantumState {
    const newState = [...state];
    const factor = 1 / Math.sqrt(2);

    for (let i = 0; i < state.length; i++) {
      const bit = (i >> qubit) & 1;
      if (bit === 0) {
        const j = i | (1 << qubit);
        const a = state[i];
        const b = state[j];

        newState[i] = {
          real: factor * (a.real + b.real),
          imag: factor * (a.imag + b.imag),
        };
        newState[j] = {
          real: factor * (a.real - b.real),
          imag: factor * (a.imag - b.imag),
        };
      }
    }

    return newState;
  }

  private applyPhase(state: QuantumState, qubit: number): QuantumState {
    const newState = [...state];

    for (let i = 0; i < state.length; i++) {
      const bit = (i >> qubit) & 1;
      if (bit === 1) {
        const temp = newState[i];
        newState[i] = { real: -temp.imag, imag: temp.real }; // Multiply by i
      }
    }

    return newState;
  }

  private applyT(state: QuantumState, qubit: number): QuantumState {
    const newState = [...state];
    const factor = 1 / Math.sqrt(2);

    for (let i = 0; i < state.length; i++) {
      const bit = (i >> qubit) & 1;
      if (bit === 1) {
        const temp = newState[i];
        newState[i] = {
          real: factor * (temp.real - temp.imag),
          imag: factor * (temp.real + temp.imag),
        };
      }
    }

    return newState;
  }

  private applyRX(state: QuantumState, qubit: number, theta: number): QuantumState {
    const newState = [...state];
    const cos = Math.cos(theta / 2);
    const sin = Math.sin(theta / 2);

    for (let i = 0; i < state.length; i++) {
      const bit = (i >> qubit) & 1;
      if (bit === 0) {
        const j = i | (1 << qubit);
        const a = state[i];
        const b = state[j];

        newState[i] = {
          real: cos * a.real + sin * b.imag,
          imag: cos * a.imag - sin * b.real,
        };
        newState[j] = {
          real: cos * b.real + sin * a.imag,
          imag: cos * b.imag - sin * a.real,
        };
      }
    }

    return newState;
  }

  private applyRY(state: QuantumState, qubit: number, theta: number): QuantumState {
    const newState = [...state];
    const cos = Math.cos(theta / 2);
    const sin = Math.sin(theta / 2);

    for (let i = 0; i < state.length; i++) {
      const bit = (i >> qubit) & 1;
      if (bit === 0) {
        const j = i | (1 << qubit);
        const a = state[i];
        const b = state[j];

        newState[i] = {
          real: cos * a.real - sin * b.real,
          imag: cos * a.imag - sin * b.imag,
        };
        newState[j] = {
          real: sin * a.real + cos * b.real,
          imag: sin * a.imag + cos * b.imag,
        };
      }
    }

    return newState;
  }

  private applyRZ(state: QuantumState, qubit: number, theta: number): QuantumState {
    const newState = [...state];
    const factor = theta / 2;

    for (let i = 0; i < state.length; i++) {
      const bit = (i >> qubit) & 1;
      const phase = bit === 0 ? -factor : factor;
      const cos = Math.cos(phase);
      const sin = Math.sin(phase);

      const temp = newState[i];
      newState[i] = {
        real: cos * temp.real - sin * temp.imag,
        imag: sin * temp.real + cos * temp.imag,
      };
    }

    return newState;
  }

  private applyCNOT(state: QuantumState, control: number, target: number): QuantumState {
    const newState = [...state];

    for (let i = 0; i < state.length; i++) {
      const controlBit = (i >> control) & 1;
      if (controlBit === 1) {
        const targetBit = (i >> target) & 1;
        const j = targetBit === 0 ? i | (1 << target) : i & ~(1 << target);
        [newState[i], newState[j]] = [newState[j], newState[i]];
      }
    }

    return newState;
  }

  private applyCZ(state: QuantumState, control: number, target: number): QuantumState {
    const newState = [...state];

    for (let i = 0; i < state.length; i++) {
      const controlBit = (i >> control) & 1;
      const targetBit = (i >> target) & 1;
      if (controlBit === 1 && targetBit === 1) {
        newState[i] = { real: -newState[i].real, imag: -newState[i].imag };
      }
    }

    return newState;
  }

  private applySWAP(state: QuantumState, qubit1: number, qubit2: number): QuantumState {
    const newState = [...state];

    for (let i = 0; i < state.length; i++) {
      const bit1 = (i >> qubit1) & 1;
      const bit2 = (i >> qubit2) & 1;

      if (bit1 !== bit2) {
        const j = (i & ~(1 << qubit1) & ~(1 << qubit2)) | (bit2 << qubit1) | (bit1 << qubit2);
        if (i < j) {
          [newState[i], newState[j]] = [newState[j], newState[i]];
        }
      }
    }

    return newState;
  }

  private measureStatevector(state: QuantumState, numQubits: number, shots: number): Record<string, number> {
    const counts: Record<string, number> = {};

    // Calculate probabilities
    const probabilities = state.map(amplitude => amplitude.real ** 2 + amplitude.imag ** 2);

    // Sample measurements
    for (let shot = 0; shot < shots; shot++) {
      const rand = Math.random();
      let cumulative = 0;
      let outcome = 0;

      for (let i = 0; i < probabilities.length; i++) {
        cumulative += probabilities[i];
        if (rand < cumulative) {
          outcome = i;
          break;
        }
      }

      const bitstring = outcome.toString(2).padStart(numQubits, '0');
      counts[bitstring] = (counts[bitstring] || 0) + 1;
    }

    return counts;
  }
}

export function createStatevectorSimulator(): QuantumSimulator {
  return new StatevectorSimulator();
}
