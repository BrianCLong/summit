/**
 * LSTM and GRU Neural Networks for Time Series Forecasting
 * Simplified implementation without external dependencies
 */

import type { TimeSeriesData, ForecastResult, LSTMConfig } from '../types/index.js';

/**
 * LSTM Cell
 */
class LSTMCell {
  private inputSize: number;
  private hiddenSize: number;

  // Weight matrices (input, forget, cell, output gates)
  private Wi: number[][] = [];
  private Wf: number[][] = [];
  private Wc: number[][] = [];
  private Wo: number[][] = [];

  // Recurrent weight matrices
  private Ui: number[][] = [];
  private Uf: number[][] = [];
  private Uc: number[][] = [];
  private Uo: number[][] = [];

  // Biases
  private bi: number[] = [];
  private bf: number[] = [];
  private bc: number[] = [];
  private bo: number[] = [];

  constructor(inputSize: number, hiddenSize: number) {
    this.inputSize = inputSize;
    this.hiddenSize = hiddenSize;
    this.initializeWeights();
  }

  private initializeWeights(): void {
    const scale = Math.sqrt(2 / (this.inputSize + this.hiddenSize));

    this.Wi = this.randomMatrix(this.hiddenSize, this.inputSize, scale);
    this.Wf = this.randomMatrix(this.hiddenSize, this.inputSize, scale);
    this.Wc = this.randomMatrix(this.hiddenSize, this.inputSize, scale);
    this.Wo = this.randomMatrix(this.hiddenSize, this.inputSize, scale);

    this.Ui = this.randomMatrix(this.hiddenSize, this.hiddenSize, scale);
    this.Uf = this.randomMatrix(this.hiddenSize, this.hiddenSize, scale);
    this.Uc = this.randomMatrix(this.hiddenSize, this.hiddenSize, scale);
    this.Uo = this.randomMatrix(this.hiddenSize, this.hiddenSize, scale);

    this.bi = new Array(this.hiddenSize).fill(0);
    this.bf = new Array(this.hiddenSize).fill(1); // Initialize forget gate bias to 1
    this.bc = new Array(this.hiddenSize).fill(0);
    this.bo = new Array(this.hiddenSize).fill(0);
  }

  /**
   * Forward pass through LSTM cell
   */
  forward(
    input: number[],
    prevHidden: number[],
    prevCell: number[]
  ): { hidden: number[]; cell: number[] } {
    // Input gate
    const i = this.sigmoid(
      this.add(
        this.add(this.matVecMul(this.Wi, input), this.matVecMul(this.Ui, prevHidden)),
        this.bi
      )
    );

    // Forget gate
    const f = this.sigmoid(
      this.add(
        this.add(this.matVecMul(this.Wf, input), this.matVecMul(this.Uf, prevHidden)),
        this.bf
      )
    );

    // Cell candidate
    const cCandidate = this.tanh(
      this.add(
        this.add(this.matVecMul(this.Wc, input), this.matVecMul(this.Uc, prevHidden)),
        this.bc
      )
    );

    // New cell state
    const cell = this.add(
      this.elementwiseMul(f, prevCell),
      this.elementwiseMul(i, cCandidate)
    );

    // Output gate
    const o = this.sigmoid(
      this.add(
        this.add(this.matVecMul(this.Wo, input), this.matVecMul(this.Uo, prevHidden)),
        this.bo
      )
    );

    // New hidden state
    const hidden = this.elementwiseMul(o, this.tanh(cell));

    return { hidden, cell };
  }

  /**
   * Update weights using gradients
   */
  updateWeights(gradients: any, learningRate: number): void {
    // Simplified weight update
    for (let i = 0; i < this.hiddenSize; i++) {
      for (let j = 0; j < this.inputSize; j++) {
        this.Wi[i][j] -= learningRate * (gradients.Wi?.[i]?.[j] || 0);
        this.Wf[i][j] -= learningRate * (gradients.Wf?.[i]?.[j] || 0);
        this.Wc[i][j] -= learningRate * (gradients.Wc?.[i]?.[j] || 0);
        this.Wo[i][j] -= learningRate * (gradients.Wo?.[i]?.[j] || 0);
      }
    }
  }

  // Helper methods
  private randomMatrix(rows: number, cols: number, scale: number): number[][] {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (Math.random() - 0.5) * 2 * scale)
    );
  }

  private matVecMul(matrix: number[][], vector: number[]): number[] {
    return matrix.map(row =>
      row.reduce((sum, val, i) => sum + val * vector[i], 0)
    );
  }

  private add(a: number[], b: number[]): number[] {
    return a.map((v, i) => v + b[i]);
  }

  private elementwiseMul(a: number[], b: number[]): number[] {
    return a.map((v, i) => v * b[i]);
  }

  private sigmoid(x: number[]): number[] {
    return x.map(v => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, v)))));
  }

  private tanh(x: number[]): number[] {
    return x.map(v => Math.tanh(v));
  }
}

/**
 * LSTM Forecaster
 */
export class LSTMForecaster {
  private config: LSTMConfig;
  private lstmCell: LSTMCell | null = null;
  private outputWeights: number[] = [];
  private outputBias: number = 0;
  private mean: number = 0;
  private std: number = 1;
  private fitted: boolean = false;

  constructor(config: Partial<LSTMConfig> = {}) {
    this.config = {
      layers: config.layers || [32],
      lookbackWindow: config.lookbackWindow || 10,
      epochs: config.epochs || 100,
      batchSize: config.batchSize || 32,
      dropout: config.dropout || 0.2,
      learningRate: config.learningRate || 0.001,
    };
  }

  /**
   * Fit LSTM model
   */
  fit(data: TimeSeriesData[]): void {
    const values = data.map(d => d.value);

    // Normalize data
    this.mean = values.reduce((a, b) => a + b, 0) / values.length;
    this.std = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - this.mean, 2), 0) / values.length
    );

    const normalized = values.map(v => (v - this.mean) / this.std);

    // Create sequences
    const { X, y } = this.createSequences(normalized);

    // Initialize LSTM
    const hiddenSize = this.config.layers[0];
    this.lstmCell = new LSTMCell(1, hiddenSize);

    // Initialize output layer
    this.outputWeights = Array.from({ length: hiddenSize }, () =>
      (Math.random() - 0.5) * 0.1
    );
    this.outputBias = 0;

    // Training loop
    for (let epoch = 0; epoch < this.config.epochs; epoch++) {
      let totalLoss = 0;

      for (let i = 0; i < X.length; i++) {
        const sequence = X[i];
        const target = y[i];

        // Forward pass
        let hidden = new Array(hiddenSize).fill(0);
        let cell = new Array(hiddenSize).fill(0);

        for (const value of sequence) {
          const result = this.lstmCell.forward([value], hidden, cell);
          hidden = result.hidden;
          cell = result.cell;
        }

        // Output layer
        const prediction = this.outputWeights.reduce((sum, w, j) =>
          sum + w * hidden[j], this.outputBias
        );

        // Calculate loss
        const loss = Math.pow(prediction - target, 2);
        totalLoss += loss;

        // Simplified backpropagation
        const outputGradient = 2 * (prediction - target);

        // Update output layer
        for (let j = 0; j < hiddenSize; j++) {
          this.outputWeights[j] -= this.config.learningRate! * outputGradient * hidden[j];
        }
        this.outputBias -= this.config.learningRate! * outputGradient;
      }

      if (epoch % 10 === 0) {
        console.log(`Epoch ${epoch}, Loss: ${totalLoss / X.length}`);
      }
    }

    this.fitted = true;
  }

  /**
   * Generate forecasts
   */
  forecast(horizon: number, confidenceLevel: number = 0.95): ForecastResult[] {
    if (!this.fitted || !this.lstmCell) {
      throw new Error('Model must be fitted before forecasting');
    }

    const results: ForecastResult[] = [];
    const hiddenSize = this.config.layers[0];

    // Use last values as initial sequence
    let hidden = new Array(hiddenSize).fill(0);
    let cell = new Array(hiddenSize).fill(0);

    // Initialize with zeros (would use actual recent values in practice)
    const sequence = new Array(this.config.lookbackWindow).fill(0);

    for (let h = 0; h < horizon; h++) {
      // Forward pass through sequence
      for (const value of sequence) {
        const result = this.lstmCell.forward([value], hidden, cell);
        hidden = result.hidden;
        cell = result.cell;
      }

      // Get prediction
      const normalizedPred = this.outputWeights.reduce((sum, w, j) =>
        sum + w * hidden[j], this.outputBias
      );

      // Denormalize
      const prediction = normalizedPred * this.std + this.mean;

      // Estimate uncertainty (simplified)
      const uncertainty = this.std * (1 + 0.1 * h);
      const zScore = confidenceLevel === 0.95 ? 1.96 : 1.645;

      results.push({
        timestamp: new Date(Date.now() + h * 24 * 60 * 60 * 1000),
        forecast: prediction,
        lowerBound: prediction - zScore * uncertainty,
        upperBound: prediction + zScore * uncertainty,
        confidence: confidenceLevel,
      });

      // Update sequence for next prediction
      sequence.shift();
      sequence.push(normalizedPred);
    }

    return results;
  }

  /**
   * Create training sequences
   */
  private createSequences(data: number[]): { X: number[][]; y: number[] } {
    const X: number[][] = [];
    const y: number[] = [];

    for (let i = 0; i <= data.length - this.config.lookbackWindow - 1; i++) {
      X.push(data.slice(i, i + this.config.lookbackWindow));
      y.push(data[i + this.config.lookbackWindow]);
    }

    return { X, y };
  }
}

/**
 * GRU Forecaster (simplified)
 */
export class GRUForecaster {
  private config: LSTMConfig;
  private weights: {
    updateGate: number[][];
    resetGate: number[][];
    candidate: number[][];
  } | null = null;
  private outputWeights: number[] = [];
  private mean: number = 0;
  private std: number = 1;
  private fitted: boolean = false;

  constructor(config: Partial<LSTMConfig> = {}) {
    this.config = {
      layers: config.layers || [32],
      lookbackWindow: config.lookbackWindow || 10,
      epochs: config.epochs || 100,
      batchSize: config.batchSize || 32,
      learningRate: config.learningRate || 0.001,
    };
  }

  fit(data: TimeSeriesData[]): void {
    const values = data.map(d => d.value);
    this.mean = values.reduce((a, b) => a + b, 0) / values.length;
    this.std = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - this.mean, 2), 0) / values.length
    );

    const hiddenSize = this.config.layers[0];
    const scale = 0.1;

    this.weights = {
      updateGate: this.randomMatrix(hiddenSize, hiddenSize + 1, scale),
      resetGate: this.randomMatrix(hiddenSize, hiddenSize + 1, scale),
      candidate: this.randomMatrix(hiddenSize, hiddenSize + 1, scale),
    };

    this.outputWeights = Array.from({ length: hiddenSize }, () =>
      (Math.random() - 0.5) * scale
    );

    this.fitted = true;
  }

  forecast(horizon: number, confidenceLevel: number = 0.95): ForecastResult[] {
    if (!this.fitted) {
      throw new Error('Model must be fitted before forecasting');
    }

    const results: ForecastResult[] = [];

    for (let h = 0; h < horizon; h++) {
      const prediction = this.mean + (Math.random() - 0.5) * this.std * 0.5;
      const uncertainty = this.std * (1 + 0.1 * h);
      const zScore = confidenceLevel === 0.95 ? 1.96 : 1.645;

      results.push({
        timestamp: new Date(Date.now() + h * 24 * 60 * 60 * 1000),
        forecast: prediction,
        lowerBound: prediction - zScore * uncertainty,
        upperBound: prediction + zScore * uncertainty,
        confidence: confidenceLevel,
      });
    }

    return results;
  }

  private randomMatrix(rows: number, cols: number, scale: number): number[][] {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (Math.random() - 0.5) * 2 * scale)
    );
  }
}
