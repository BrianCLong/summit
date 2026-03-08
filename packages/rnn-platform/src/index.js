"use strict";
/**
 * @intelgraph/rnn-platform
 * Recurrent and sequence modeling platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLSTM = createLSTM;
exports.createSeq2Seq = createSeq2Seq;
exports.createTimeSeriesForecaster = createTimeSeriesForecaster;
// LSTM architecture
function createLSTM(config) {
    const layers = [
        { type: 'input', name: 'input', config: { shape: [null, config.inputDim] } },
    ];
    for (let i = 0; i < config.numLayers; i++) {
        layers.push({
            type: 'lstm',
            name: `lstm_${i}`,
            config: {
                units: config.units,
                returnSequences: i < config.numLayers - 1,
                dropout: config.dropout || 0,
                bidirectional: config.bidirectional || false,
            },
        });
    }
    layers.push({ type: 'dense', name: 'output', config: { units: config.inputDim } });
    return {
        name: 'LSTM',
        type: 'recurrent',
        layers,
        inputShape: [-1, config.inputDim],
        outputShape: [config.inputDim],
        description: 'Long Short-Term Memory network',
    };
}
// Seq2Seq with attention
function createSeq2Seq(config) {
    return {
        name: 'Seq2Seq',
        type: 'recurrent',
        layers: [
            { type: 'encoder_input', name: 'encoder_input', config: { shape: [null, config.encoderInputDim] } },
            { type: 'lstm', name: 'encoder', config: { units: config.latentDim, returnState: true } },
            { type: 'decoder_input', name: 'decoder_input', config: { shape: [null, config.decoderInputDim] } },
            { type: 'lstm', name: 'decoder', config: { units: config.latentDim, returnSequences: true } },
            { type: 'attention', name: 'attention', config: {} },
            { type: 'dense', name: 'output', config: { units: config.decoderInputDim, activation: 'softmax' } },
        ],
        inputShape: [-1, config.encoderInputDim],
        outputShape: [-1, config.decoderInputDim],
        description: 'Sequence-to-Sequence with attention',
    };
}
function createTimeSeriesForecaster(config) {
    return {
        name: 'TimeSeriesForecaster',
        type: 'recurrent',
        layers: [
            { type: 'input', name: 'input', config: { shape: [config.lookbackWindow, config.features] } },
            { type: 'lstm', name: 'lstm1', config: { units: 128, returnSequences: true } },
            { type: 'lstm', name: 'lstm2', config: { units: 64 } },
            { type: 'dense', name: 'output', config: { units: config.forecastHorizon } },
        ],
        inputShape: [config.lookbackWindow, config.features],
        outputShape: [config.forecastHorizon],
        description: 'LSTM-based time series forecasting',
    };
}
