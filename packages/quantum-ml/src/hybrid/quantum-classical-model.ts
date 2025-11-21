/**
 * Hybrid Quantum-Classical Model
 * Combines quantum circuits with classical neural networks
 */

import { QuantumSimulator } from '@summit/quantum-simulation';
import { QuantumNeuralNetwork, QNNParams } from '../circuits/quantum-neural-network';

export interface HybridModelConfig {
  quantumParams: QNNParams;
  classicalLayers: number[];
  activation: 'relu' | 'sigmoid' | 'tanh';
}

export class HybridQuantumClassicalModel {
  private qnn: QuantumNeuralNetwork;
  private classicalWeights: number[][][];
  private config: HybridModelConfig;

  constructor(config: HybridModelConfig, simulator: QuantumSimulator) {
    this.config = config;
    this.qnn = new QuantumNeuralNetwork(config.quantumParams, simulator);
    this.classicalWeights = this.initializeClassicalWeights();
  }

  async forward(input: number[]): Promise<number[]> {
    // Quantum layer
    let output = await this.qnn.forward(input);

    // Classical layers
    for (let layer = 0; layer < this.config.classicalLayers.length; layer++) {
      output = this.applyClassicalLayer(output, this.classicalWeights[layer]);
      output = this.applyActivation(output);
    }

    return output;
  }

  async train(X: number[][], y: number[][], epochs: number, learningRate: number): Promise<void> {
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

  private applyClassicalLayer(input: number[], weights: number[][]): number[] {
    const output: number[] = Array(weights.length).fill(0);

    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < input.length; j++) {
        output[i] += weights[i][j] * input[j];
      }
    }

    return output;
  }

  private applyActivation(input: number[]): number[] {
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

  private computeLoss(predicted: number[], target: number[]): number {
    return predicted.reduce((sum, p, i) => sum + (p - target[i]) ** 2, 0) / predicted.length;
  }

  private async backpropagate(input: number[], target: number[], learningRate: number): Promise<void> {
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

  private initializeClassicalWeights(): number[][][] {
    const weights: number[][][] = [];
    let inputSize = this.config.quantumParams.numQubits;

    for (const layerSize of this.config.classicalLayers) {
      const layerWeights: number[][] = [];
      for (let i = 0; i < layerSize; i++) {
        const neuronWeights: number[] = [];
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

export function createHybridModel(config: HybridModelConfig, simulator: QuantumSimulator): HybridQuantumClassicalModel {
  return new HybridQuantumClassicalModel(config, simulator);
}
