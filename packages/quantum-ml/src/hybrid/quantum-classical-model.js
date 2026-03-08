"use strict";
/**
 * Hybrid Quantum-Classical Model
 * Combines quantum circuits with classical neural networks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HybridQuantumClassicalModel = void 0;
exports.createHybridModel = createHybridModel;
const quantum_neural_network_1 = require("../circuits/quantum-neural-network");
class HybridQuantumClassicalModel {
    qnn;
    classicalWeights;
    config;
    constructor(config, simulator) {
        this.config = config;
        this.qnn = new quantum_neural_network_1.QuantumNeuralNetwork(config.quantumParams, simulator);
        this.classicalWeights = this.initializeClassicalWeights();
    }
    async forward(input) {
        // Quantum layer
        let output = await this.qnn.forward(input);
        // Classical layers
        for (let layer = 0; layer < this.config.classicalLayers.length; layer++) {
            output = this.applyClassicalLayer(output, this.classicalWeights[layer]);
            output = this.applyActivation(output);
        }
        return output;
    }
    async train(X, y, epochs, learningRate) {
        for (let epoch = 0; epoch < epochs; epoch++) {
            let totalLoss = 0;
            for (let i = 0; i < X.length; i++) {
                // Forward pass
                const output = await this.forward(X[i]);
                const loss = this.computeLoss(output, y[i]);
                totalLoss += loss;
                // Backward pass (simplified gradient descent)
                await this.backpropagate(X[i], y[i], learningRate);
            }
            if (epoch % 10 === 0) {
                console.log(`Epoch ${epoch}, Loss: ${totalLoss / X.length}`);
            }
        }
    }
    applyClassicalLayer(input, weights) {
        const output = Array(weights.length).fill(0);
        for (let i = 0; i < weights.length; i++) {
            for (let j = 0; j < input.length; j++) {
                output[i] += weights[i][j] * input[j];
            }
        }
        return output;
    }
    applyActivation(input) {
        switch (this.config.activation) {
            case 'relu':
                return input.map(x => Math.max(0, x));
            case 'sigmoid':
                return input.map(x => 1 / (1 + Math.exp(-x)));
            case 'tanh':
                return input.map(x => Math.tanh(x));
            default:
                return input;
        }
    }
    computeLoss(predicted, target) {
        return predicted.reduce((sum, p, i) => sum + (p - target[i]) ** 2, 0) / predicted.length;
    }
    async backpropagate(input, target, learningRate) {
        // Simplified backpropagation
        // In practice, would use automatic differentiation
        const epsilon = 0.01;
        // Update quantum weights
        const qnnWeights = this.qnn.getWeights();
        for (let i = 0; i < qnnWeights.length; i++) {
            qnnWeights[i] += epsilon;
            this.qnn.setWeights(qnnWeights);
            const outputPlus = await this.forward(input);
            const lossPlus = this.computeLoss(outputPlus, target);
            qnnWeights[i] -= 2 * epsilon;
            this.qnn.setWeights(qnnWeights);
            const outputMinus = await this.forward(input);
            const lossMinus = this.computeLoss(outputMinus, target);
            qnnWeights[i] += epsilon;
            const gradient = (lossPlus - lossMinus) / (2 * epsilon);
            qnnWeights[i] -= learningRate * gradient;
        }
        this.qnn.setWeights(qnnWeights);
        // Update classical weights
        for (let layer = 0; layer < this.classicalWeights.length; layer++) {
            for (let i = 0; i < this.classicalWeights[layer].length; i++) {
                for (let j = 0; j < this.classicalWeights[layer][i].length; j++) {
                    this.classicalWeights[layer][i][j] += epsilon;
                    const outputPlus = await this.forward(input);
                    const lossPlus = this.computeLoss(outputPlus, target);
                    this.classicalWeights[layer][i][j] -= 2 * epsilon;
                    const outputMinus = await this.forward(input);
                    const lossMinus = this.computeLoss(outputMinus, target);
                    this.classicalWeights[layer][i][j] += epsilon;
                    const gradient = (lossPlus - lossMinus) / (2 * epsilon);
                    this.classicalWeights[layer][i][j] -= learningRate * gradient;
                }
            }
        }
    }
    initializeClassicalWeights() {
        const weights = [];
        let inputSize = this.config.quantumParams.numQubits;
        for (const layerSize of this.config.classicalLayers) {
            const layerWeights = [];
            for (let i = 0; i < layerSize; i++) {
                const neuronWeights = [];
                for (let j = 0; j < inputSize; j++) {
                    neuronWeights.push((Math.random() - 0.5) * 0.1);
                }
                layerWeights.push(neuronWeights);
            }
            weights.push(layerWeights);
            inputSize = layerSize;
        }
        return weights;
    }
}
exports.HybridQuantumClassicalModel = HybridQuantumClassicalModel;
function createHybridModel(config, simulator) {
    return new HybridQuantumClassicalModel(config, simulator);
}
