"use strict";
/**
 * Quantum Neural Network
 * Parameterized quantum circuit for machine learning
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuantumNeuralNetwork = void 0;
exports.createQNN = createQNN;
const quantum_simulation_1 = require("@intelgraph/quantum-simulation");
class QuantumNeuralNetwork {
    params;
    simulator;
    weights;
    constructor(params, simulator) {
        this.params = params;
        this.simulator = simulator;
        this.weights = this.initializeWeights();
    }
    async forward(input) {
        const circuit = this.buildQNN(input, this.weights);
        const result = await this.simulator.simulate(circuit, 1024);
        // Extract output from measurement probabilities
        return this.extractOutput(result.counts);
    }
    async train(X, y, config) {
        for (let epoch = 0; epoch < config.epochs; epoch++) {
            let totalLoss = 0;
            for (let i = 0; i < X.length; i++) {
                // Forward pass
                const output = await this.forward(X[i]);
                const loss = this.computeLoss(output, y[i]);
                totalLoss += loss;
                // Backward pass (parameter shift rule)
                const gradients = await this.computeGradients(X[i], y[i]);
                // Update weights
                this.updateWeights(gradients, config.learningRate);
            }
            if (epoch % 10 === 0) {
                console.log(`Epoch ${epoch}, Loss: ${totalLoss / X.length}`);
            }
        }
    }
    buildQNN(input, weights) {
        const builder = new quantum_simulation_1.CircuitBuilder(this.params.numQubits);
        // Encode input
        this.encodeInput(builder, input);
        // Variational layers
        let weightIdx = 0;
        for (let layer = 0; layer < this.params.layers; layer++) {
            // Rotation layer
            for (let qubit = 0; qubit < this.params.numQubits; qubit++) {
                builder.ry(qubit, weights[weightIdx++]);
                builder.rz(qubit, weights[weightIdx++]);
            }
            // Entanglement layer
            this.applyEntanglement(builder);
        }
        builder.measure();
        return builder.build();
    }
    encodeInput(builder, input) {
        for (let i = 0; i < Math.min(input.length, this.params.numQubits); i++) {
            builder.ry(i, input[i]);
        }
    }
    applyEntanglement(builder) {
        if (this.params.entangling === 'linear') {
            for (let i = 0; i < this.params.numQubits - 1; i++) {
                builder.cnot(i, i + 1);
            }
        }
        else if (this.params.entangling === 'circular') {
            for (let i = 0; i < this.params.numQubits; i++) {
                builder.cnot(i, (i + 1) % this.params.numQubits);
            }
        }
        else if (this.params.entangling === 'full') {
            for (let i = 0; i < this.params.numQubits; i++) {
                for (let j = i + 1; j < this.params.numQubits; j++) {
                    builder.cnot(i, j);
                }
            }
        }
    }
    extractOutput(counts) {
        const output = Array(this.params.numQubits).fill(0);
        let totalCounts = 0;
        for (const [bitstring, count] of Object.entries(counts)) {
            for (let i = 0; i < bitstring.length; i++) {
                if (bitstring[i] === '1') {
                    output[i] += count;
                }
            }
            totalCounts += count;
        }
        return output.map(o => o / totalCounts);
    }
    computeLoss(predicted, target) {
        // Mean squared error
        const targetArray = Array(predicted.length).fill(0);
        targetArray[0] = target;
        return predicted.reduce((sum, p, i) => sum + (p - targetArray[i]) ** 2, 0) / predicted.length;
    }
    async computeGradients(input, target) {
        const gradients = [];
        const epsilon = Math.PI / 2; // Parameter shift rule
        const output = await this.forward(input);
        const baseLoss = this.computeLoss(output, target);
        for (let i = 0; i < this.weights.length; i++) {
            // Shift parameter up
            this.weights[i] += epsilon;
            const outputPlus = await this.forward(input);
            const lossPlus = this.computeLoss(outputPlus, target);
            // Shift parameter down
            this.weights[i] -= 2 * epsilon;
            const outputMinus = await this.forward(input);
            const lossMinus = this.computeLoss(outputMinus, target);
            // Restore parameter
            this.weights[i] += epsilon;
            // Gradient using parameter shift rule
            gradients.push((lossPlus - lossMinus) / 2);
        }
        return gradients;
    }
    updateWeights(gradients, learningRate) {
        for (let i = 0; i < this.weights.length; i++) {
            this.weights[i] -= learningRate * gradients[i];
        }
    }
    initializeWeights() {
        const numWeights = this.params.layers * this.params.numQubits * 2;
        return Array(numWeights).fill(0).map(() => Math.random() * 2 * Math.PI);
    }
    getWeights() {
        return [...this.weights];
    }
    setWeights(weights) {
        this.weights = [...weights];
    }
}
exports.QuantumNeuralNetwork = QuantumNeuralNetwork;
function createQNN(params, simulator) {
    return new QuantumNeuralNetwork(params, simulator);
}
