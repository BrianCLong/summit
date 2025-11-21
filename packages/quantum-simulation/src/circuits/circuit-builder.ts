/**
 * Quantum Circuit Builder
 * Fluent API for building quantum circuits
 */

import { QuantumCircuit, QuantumGate, GateType } from '../types';

export class CircuitBuilder {
  private _circuit: QuantumCircuit;

  constructor(numQubits: number) {
    this._circuit = {
      numQubits,
      gates: [],
    };
  }

  /** Get the underlying circuit (read-only access for advanced use cases) */
  get circuit(): QuantumCircuit {
    return this._circuit;
  }

  /** Get number of qubits in the circuit */
  get numQubits(): number {
    return this._circuit.numQubits;
  }

  /** Get current gate count */
  get gateCount(): number {
    return this._circuit.gates.length;
  }

  /** Add a gate directly to the circuit */
  addGate(gate: QuantumGate): this {
    this._circuit.gates.push(gate);
    return this;
  }

  // Single-qubit gates
  x(qubit: number): this {
    this.validateQubit(qubit);
    this._circuit.gates.push({ type: GateType.PAULI_X, qubits: [qubit] });
    return this;
  }

  y(qubit: number): this {
    this.validateQubit(qubit);
    this._circuit.gates.push({ type: GateType.PAULI_Y, qubits: [qubit] });
    return this;
  }

  z(qubit: number): this {
    this.validateQubit(qubit);
    this._circuit.gates.push({ type: GateType.PAULI_Z, qubits: [qubit] });
    return this;
  }

  h(qubit: number): this {
    this.validateQubit(qubit);
    this._circuit.gates.push({ type: GateType.HADAMARD, qubits: [qubit] });
    return this;
  }

  s(qubit: number): this {
    this.validateQubit(qubit);
    this._circuit.gates.push({ type: GateType.PHASE, qubits: [qubit] });
    return this;
  }

  t(qubit: number): this {
    this.validateQubit(qubit);
    this._circuit.gates.push({ type: GateType.T_GATE, qubits: [qubit] });
    return this;
  }

  rx(qubit: number, theta: number): this {
    this.validateQubit(qubit);
    this._circuit.gates.push({ type: GateType.RX, qubits: [qubit], parameters: [theta] });
    return this;
  }

  ry(qubit: number, theta: number): this {
    this.validateQubit(qubit);
    this._circuit.gates.push({ type: GateType.RY, qubits: [qubit], parameters: [theta] });
    return this;
  }

  rz(qubit: number, theta: number): this {
    this.validateQubit(qubit);
    this._circuit.gates.push({ type: GateType.RZ, qubits: [qubit], parameters: [theta] });
    return this;
  }

  // Two-qubit gates
  cnot(control: number, target: number): this {
    this.validateQubit(control);
    this.validateQubit(target);
    if (control === target) {
      throw new Error('Control and target qubits must be different');
    }
    this._circuit.gates.push({ type: GateType.CNOT, qubits: [control, target] });
    return this;
  }

  cx(control: number, target: number): this {
    return this.cnot(control, target);
  }

  cz(control: number, target: number): this {
    this.validateQubit(control);
    this.validateQubit(target);
    if (control === target) {
      throw new Error('Control and target qubits must be different');
    }
    this._circuit.gates.push({ type: GateType.CZ, qubits: [control, target] });
    return this;
  }

  swap(qubit1: number, qubit2: number): this {
    this.validateQubit(qubit1);
    this.validateQubit(qubit2);
    if (qubit1 === qubit2) {
      throw new Error('Cannot swap a qubit with itself');
    }
    this._circuit.gates.push({ type: GateType.SWAP, qubits: [qubit1, qubit2] });
    return this;
  }

  // Measurements
  measure(qubits?: number[]): this {
    if (qubits) {
      qubits.forEach(q => this.validateQubit(q));
    }
    this._circuit.measurements = qubits || Array.from({ length: this._circuit.numQubits }, (_, i) => i);
    return this;
  }

  // Build final circuit
  build(): QuantumCircuit {
    return { ...this._circuit, gates: [...this._circuit.gates] };
  }

  // Validation helper
  private validateQubit(qubit: number): void {
    if (qubit < 0 || qubit >= this._circuit.numQubits) {
      throw new Error(`Qubit index ${qubit} out of range [0, ${this._circuit.numQubits - 1}]`);
    }
  }

  // Helper methods
  barrier(): this {
    // Barrier doesn't affect simulation but can be used for visualization
    return this;
  }

  // Apply gate to all qubits
  applyToAll(gate: 'x' | 'y' | 'z' | 'h' | 's' | 't'): this {
    for (let i = 0; i < this._circuit.numQubits; i++) {
      this[gate](i);
    }
    return this;
  }

  // Create Bell state
  createBellState(qubit1: number = 0, qubit2: number = 1): this {
    return this.h(qubit1).cnot(qubit1, qubit2);
  }

  // Create GHZ state
  createGHZState(qubits: number[]): this {
    if (qubits.length < 2) {
      throw new Error('GHZ state requires at least 2 qubits');
    }

    this.h(qubits[0]);
    for (let i = 1; i < qubits.length; i++) {
      this.cnot(qubits[0], qubits[i]);
    }

    return this;
  }

  // Quantum Fourier Transform
  qft(qubits: number[]): this {
    const n = qubits.length;

    for (let i = 0; i < n; i++) {
      this.h(qubits[i]);

      for (let j = i + 1; j < n; j++) {
        const angle = Math.PI / (2 ** (j - i));
        // Controlled phase rotation
        this.rz(qubits[j], angle);
      }
    }

    // Reverse qubit order
    for (let i = 0; i < n / 2; i++) {
      this.swap(qubits[i], qubits[n - 1 - i]);
    }

    return this;
  }
}

export function createCircuit(numQubits: number): CircuitBuilder {
  return new CircuitBuilder(numQubits);
}
