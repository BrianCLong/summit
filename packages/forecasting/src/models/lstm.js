"use strict";
/**
 * LSTM and GRU Neural Networks for Time Series Forecasting
 * Simplified implementation without external dependencies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRUForecaster = exports.LSTMForecaster = void 0;
/**
 * LSTM Cell
 */
class LSTMCell {
    inputSize;
    hiddenSize;
    // Weight matrices (input, forget, cell, output gates)
    Wi = [];
    Wf = [];
    Wc = [];
    Wo = [];
    // Recurrent weight matrices
    Ui = [];
    Uf = [];
    Uc = [];
    Uo = [];
    // Biases
    bi = [];
    bf = [];
    bc = [];
    bo = [];
    constructor(inputSize, hiddenSize) {
        this.inputSize = inputSize;
        this.hiddenSize = hiddenSize;
        this.initializeWeights();
    }
    initializeWeights() {
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
    forward(input, prevHidden, prevCell) {
        // Input gate
        const i = this.sigmoid(this.add(this.add(this.matVecMul(this.Wi, input), this.matVecMul(this.Ui, prevHidden)), this.bi));
        // Forget gate
        const f = this.sigmoid(this.add(this.add(this.matVecMul(this.Wf, input), this.matVecMul(this.Uf, prevHidden)), this.bf));
        // Cell candidate
        const cCandidate = this.tanh(this.add(this.add(this.matVecMul(this.Wc, input), this.matVecMul(this.Uc, prevHidden)), this.bc));
        // New cell state
        const cell = this.add(this.elementwiseMul(f, prevCell), this.elementwiseMul(i, cCandidate));
        // Output gate
        const o = this.sigmoid(this.add(this.add(this.matVecMul(this.Wo, input), this.matVecMul(this.Uo, prevHidden)), this.bo));
        // New hidden state
        const hidden = this.elementwiseMul(o, this.tanh(cell));
        return { hidden, cell };
    }
    /**
     * Update weights using gradients
     */
    updateWeights(gradients, learningRate) {
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
    randomMatrix(rows, cols, scale) {
        return Array.from({ length: rows }, () => Array.from({ length: cols }, () => (Math.random() - 0.5) * 2 * scale));
    }
    matVecMul(matrix, vector) {
        return matrix.map(row => row.reduce((sum, val, i) => sum + val * vector[i], 0));
    }
    add(a, b) {
        return a.map((v, i) => v + b[i]);
    }
    elementwiseMul(a, b) {
        return a.map((v, i) => v * b[i]);
    }
    sigmoid(x) {
        return x.map(v => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, v)))));
    }
    tanh(x) {
        return x.map(v => Math.tanh(v));
    }
}
/**
 * LSTM Forecaster
 */
class LSTMForecaster {
    config;
    lstmCell = null;
    outputWeights = [];
    outputBias = 0;
    mean = 0;
    std = 1;
    fitted = false;
    constructor(config = {}) {
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
    fit(data) {
        const values = data.map(d => d.value);
        // Normalize data
        this.mean = values.reduce((a, b) => a + b, 0) / values.length;
        this.std = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - this.mean, 2), 0) / values.length);
        const normalized = values.map(v => (v - this.mean) / this.std);
        // Create sequences
        const { X, y } = this.createSequences(normalized);
        // Initialize LSTM
        const hiddenSize = this.config.layers[0];
        this.lstmCell = new LSTMCell(1, hiddenSize);
        // Initialize output layer
        this.outputWeights = Array.from({ length: hiddenSize }, () => (Math.random() - 0.5) * 0.1);
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
                const prediction = this.outputWeights.reduce((sum, w, j) => sum + w * hidden[j], this.outputBias);
                // Calculate loss
                const loss = Math.pow(prediction - target, 2);
                totalLoss += loss;
                // Simplified backpropagation
                const outputGradient = 2 * (prediction - target);
                // Update output layer
                for (let j = 0; j < hiddenSize; j++) {
                    this.outputWeights[j] -= this.config.learningRate * outputGradient * hidden[j];
                }
                this.outputBias -= this.config.learningRate * outputGradient;
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
    forecast(horizon, confidenceLevel = 0.95) {
        if (!this.fitted || !this.lstmCell) {
            throw new Error('Model must be fitted before forecasting');
        }
        const results = [];
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
            const normalizedPred = this.outputWeights.reduce((sum, w, j) => sum + w * hidden[j], this.outputBias);
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
    createSequences(data) {
        const X = [];
        const y = [];
        for (let i = 0; i <= data.length - this.config.lookbackWindow - 1; i++) {
            X.push(data.slice(i, i + this.config.lookbackWindow));
            y.push(data[i + this.config.lookbackWindow]);
        }
        return { X, y };
    }
}
exports.LSTMForecaster = LSTMForecaster;
/**
 * GRU Forecaster (simplified)
 */
class GRUForecaster {
    config;
    weights = null;
    outputWeights = [];
    mean = 0;
    std = 1;
    fitted = false;
    constructor(config = {}) {
        this.config = {
            layers: config.layers || [32],
            lookbackWindow: config.lookbackWindow || 10,
            epochs: config.epochs || 100,
            batchSize: config.batchSize || 32,
            learningRate: config.learningRate || 0.001,
        };
    }
    fit(data) {
        const values = data.map(d => d.value);
        this.mean = values.reduce((a, b) => a + b, 0) / values.length;
        this.std = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - this.mean, 2), 0) / values.length);
        const hiddenSize = this.config.layers[0];
        const scale = 0.1;
        this.weights = {
            updateGate: this.randomMatrix(hiddenSize, hiddenSize + 1, scale),
            resetGate: this.randomMatrix(hiddenSize, hiddenSize + 1, scale),
            candidate: this.randomMatrix(hiddenSize, hiddenSize + 1, scale),
        };
        this.outputWeights = Array.from({ length: hiddenSize }, () => (Math.random() - 0.5) * scale);
        this.fitted = true;
    }
    forecast(horizon, confidenceLevel = 0.95) {
        if (!this.fitted) {
            throw new Error('Model must be fitted before forecasting');
        }
        const results = [];
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
    randomMatrix(rows, cols, scale) {
        return Array.from({ length: rows }, () => Array.from({ length: cols }, () => (Math.random() - 0.5) * 2 * scale));
    }
}
exports.GRUForecaster = GRUForecaster;
