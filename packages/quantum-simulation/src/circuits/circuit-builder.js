"use strict";
/**
 * Quantum Circuit Builder
 * Fluent API for building quantum circuits
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBuilder = void 0;
exports.createCircuit = createCircuit;
const types_1 = require("../types");
class CircuitBuilder {
    circuit;
    constructor(numQubits) {
        this.circuit = {
            numQubits,
            gates: [],
        };
    }
    // Single-qubit gates
    x(qubit) {
        this.circuit.gates.push({ type: types_1.GateType.PAULI_X, qubits: [qubit] });
        return this;
    }
    y(qubit) {
        this.circuit.gates.push({ type: types_1.GateType.PAULI_Y, qubits: [qubit] });
        return this;
    }
    z(qubit) {
        this.circuit.gates.push({ type: types_1.GateType.PAULI_Z, qubits: [qubit] });
        return this;
    }
    h(qubit) {
        this.circuit.gates.push({ type: types_1.GateType.HADAMARD, qubits: [qubit] });
        return this;
    }
    s(qubit) {
        this.circuit.gates.push({ type: types_1.GateType.PHASE, qubits: [qubit] });
        return this;
    }
    t(qubit) {
        this.circuit.gates.push({ type: types_1.GateType.T_GATE, qubits: [qubit] });
        return this;
    }
    rx(qubit, theta) {
        this.circuit.gates.push({ type: types_1.GateType.RX, qubits: [qubit], parameters: [theta] });
        return this;
    }
    ry(qubit, theta) {
        this.circuit.gates.push({ type: types_1.GateType.RY, qubits: [qubit], parameters: [theta] });
        return this;
    }
    rz(qubit, theta) {
        this.circuit.gates.push({ type: types_1.GateType.RZ, qubits: [qubit], parameters: [theta] });
        return this;
    }
    // Two-qubit gates
    cnot(control, target) {
        this.circuit.gates.push({ type: types_1.GateType.CNOT, qubits: [control, target] });
        return this;
    }
    cx(control, target) {
        return this.cnot(control, target);
    }
    cz(control, target) {
        this.circuit.gates.push({ type: types_1.GateType.CZ, qubits: [control, target] });
        return this;
    }
    swap(qubit1, qubit2) {
        this.circuit.gates.push({ type: types_1.GateType.SWAP, qubits: [qubit1, qubit2] });
        return this;
    }
    // Measurements
    measure(qubits) {
        this.circuit.measurements = qubits || Array.from({ length: this.circuit.numQubits }, (_, i) => i);
        return this;
    }
    // Build final circuit
    build() {
        return this.circuit;
    }
    // Helper methods
    barrier() {
        // Barrier doesn't affect simulation but can be used for visualization
        return this;
    }
    // Apply gate to all qubits
    applyToAll(gate) {
        for (let i = 0; i < this.circuit.numQubits; i++) {
            this[gate](i);
        }
        return this;
    }
    // Create Bell state
    createBellState(qubit1 = 0, qubit2 = 1) {
        return this.h(qubit1).cnot(qubit1, qubit2);
    }
    // Create GHZ state
    createGHZState(qubits) {
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
    qft(qubits) {
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
exports.CircuitBuilder = CircuitBuilder;
function createCircuit(numQubits) {
    return new CircuitBuilder(numQubits);
}
