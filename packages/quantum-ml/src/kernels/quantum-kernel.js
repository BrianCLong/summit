"use strict";
/**
 * Quantum Kernel Methods
 * Implements quantum feature maps and kernel estimation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuantumKernel = void 0;
exports.createQuantumKernel = createQuantumKernel;
const quantum_simulation_1 = require("@intelgraph/quantum-simulation");
class QuantumKernel {
    params;
    simulator;
    constructor(params, simulator) {
        this.params = params;
        this.simulator = simulator;
    }
    async computeKernelMatrix(X) {
        const n = X.length;
        const kernelMatrix = Array(n).fill(0).map(() => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = i; j < n; j++) {
                const kernel = await this.computeKernel(X[i], X[j]);
                kernelMatrix[i][j] = kernel;
                kernelMatrix[j][i] = kernel; // Symmetric
            }
        }
        return kernelMatrix;
    }
    async computeKernel(x1, x2) {
        // Build quantum circuit for kernel estimation
        const circuit1 = this.buildFeatureMap(x1);
        const circuit2 = this.buildFeatureMap(x2);
        // Get statevectors
        const state1 = await this.simulator.getStatevector(circuit1);
        const state2 = await this.simulator.getStatevector(circuit2);
        // Compute fidelity (inner product)
        return this.computeFidelity(state1, state2);
    }
    buildFeatureMap(features) {
        const builder = new quantum_simulation_1.CircuitBuilder(this.params.numQubits);
        for (let rep = 0; rep < this.params.reps; rep++) {
            if (this.params.featureMap === 'zz') {
                this.applyZZFeatureMap(builder, features);
            }
            else if (this.params.featureMap === 'pauli') {
                this.applyPauliFeatureMap(builder, features);
            }
        }
        return builder.build();
    }
    applyZZFeatureMap(builder, features) {
        // Hadamard layer
        builder.applyToAll('h');
        // Encoding layer
        for (let i = 0; i < Math.min(features.length, this.params.numQubits); i++) {
            builder.rz(i, 2 * features[i]);
        }
        // Entanglement layer
        for (let i = 0; i < this.params.numQubits - 1; i++) {
            builder.cnot(i, i + 1);
            builder.rz(i + 1, 2 * features[i % features.length] * features[(i + 1) % features.length]);
            builder.cnot(i, i + 1);
        }
    }
    applyPauliFeatureMap(builder, features) {
        for (let i = 0; i < Math.min(features.length, this.params.numQubits); i++) {
            builder.h(i);
            builder.rz(i, 2 * features[i]);
            builder.rx(i, 2 * features[i]);
        }
    }
    computeFidelity(state1, state2) {
        let fidelity = 0;
        for (let i = 0; i < state1.length; i++) {
            // Compute |<ψ1|ψ2>|^2
            const real = state1[i].real * state2[i].real + state1[i].imag * state2[i].imag;
            const imag = state1[i].real * state2[i].imag - state1[i].imag * state2[i].real;
            fidelity += real * real + imag * imag;
        }
        return fidelity;
    }
}
exports.QuantumKernel = QuantumKernel;
function createQuantumKernel(params, simulator) {
    return new QuantumKernel(params, simulator);
}
