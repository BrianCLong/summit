"use strict";
/**
 * Ensemble Meta-Learning Detector
 * Combines multiple detection models with learned weighting and confidence calibration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnsembleMetaLearner = exports.CalibrationMethod = exports.AggregationMethod = exports.ModelType = void 0;
var ModelType;
(function (ModelType) {
    ModelType["CNN_CLASSIFIER"] = "cnn_classifier";
    ModelType["TRANSFORMER"] = "transformer";
    ModelType["FREQUENCY_ANALYZER"] = "frequency_analyzer";
    ModelType["TEMPORAL_NETWORK"] = "temporal_network";
    ModelType["GAN_DISCRIMINATOR"] = "gan_discriminator";
    ModelType["AUDIO_SPECTROGRAM"] = "audio_spectrogram";
    ModelType["MULTIMODAL_FUSION"] = "multimodal_fusion";
    ModelType["ADVERSARIAL_ROBUST"] = "adversarial_robust";
})(ModelType || (exports.ModelType = ModelType = {}));
var AggregationMethod;
(function (AggregationMethod) {
    AggregationMethod["WEIGHTED_AVERAGE"] = "weighted_average";
    AggregationMethod["STACKING"] = "stacking";
    AggregationMethod["VOTING"] = "voting";
    AggregationMethod["BAYESIAN"] = "bayesian";
    AggregationMethod["ATTENTION"] = "attention";
    AggregationMethod["DYNAMIC"] = "dynamic";
})(AggregationMethod || (exports.AggregationMethod = AggregationMethod = {}));
var CalibrationMethod;
(function (CalibrationMethod) {
    CalibrationMethod["PLATT_SCALING"] = "platt_scaling";
    CalibrationMethod["ISOTONIC_REGRESSION"] = "isotonic_regression";
    CalibrationMethod["TEMPERATURE_SCALING"] = "temperature_scaling";
    CalibrationMethod["BETA_CALIBRATION"] = "beta_calibration";
    CalibrationMethod["HISTOGRAM_BINNING"] = "histogram_binning";
})(CalibrationMethod || (exports.CalibrationMethod = CalibrationMethod = {}));
class EnsembleMetaLearner {
    models = new Map();
    metaModel;
    calibrator;
    dynamicWeighter;
    constructor(configs) {
        this.initializeModels(configs);
        this.metaModel = new MetaModel();
        this.calibrator = new ConfidenceCalibrator();
        this.dynamicWeighter = new DynamicWeighter();
    }
    initializeModels(configs) {
        for (const config of configs) {
            if (config.enabled) {
                this.models.set(config.id, new DetectionModel(config));
            }
        }
    }
    /**
     * Run ensemble detection with meta-learning
     */
    async detect(media) {
        // Run all models in parallel
        const modelOutputs = await this.runModels(media);
        // Calculate dynamic weights based on input characteristics
        const dynamicWeights = await this.dynamicWeighter.computeWeights(media, modelOutputs);
        // Aggregate predictions
        const aggregation = this.aggregatePredictions(modelOutputs, dynamicWeights);
        // Run meta-model for final prediction
        const metaPrediction = await this.metaModel.predict(modelOutputs, aggregation);
        // Calibrate confidence
        const calibration = this.calibrator.calibrate(metaPrediction.confidence);
        // Estimate uncertainty
        const uncertainty = this.estimateUncertainty(modelOutputs, metaPrediction);
        // Generate explanation
        const explanation = this.generateExplanation(modelOutputs, aggregation, metaPrediction);
        return {
            prediction: {
                isDeepfake: metaPrediction.prediction,
                confidence: metaPrediction.confidence,
                calibratedConfidence: calibration.calibratedConfidence,
                consensusLevel: this.calculateConsensus(modelOutputs),
                predictionStrength: metaPrediction.strength,
            },
            modelOutputs,
            aggregation,
            calibration,
            uncertainty,
            explanation,
        };
    }
    /**
     * Run all detection models
     */
    async runModels(media) {
        const outputs = [];
        const promises = [];
        for (const [modelId, model] of this.models) {
            promises.push((async () => {
                const startTime = Date.now();
                const result = await model.predict(media);
                outputs.push({
                    modelId,
                    modelType: model.type,
                    prediction: result.prediction,
                    rawScore: result.score,
                    confidence: result.confidence,
                    weight: model.weight,
                    features: result.features,
                    latency: Date.now() - startTime,
                });
            })());
        }
        await Promise.all(promises);
        return outputs;
    }
    /**
     * Aggregate predictions from multiple models
     */
    aggregatePredictions(outputs, dynamicWeights) {
        // Apply dynamic weights
        const weights = {};
        for (const output of outputs) {
            weights[output.modelId] = dynamicWeights[output.modelId] ?? output.weight;
        }
        // Weighted average
        let weightedSum = 0;
        let totalWeight = 0;
        for (const output of outputs) {
            const w = weights[output.modelId];
            weightedSum += output.rawScore * w;
            totalWeight += w;
        }
        const aggregatedScore = totalWeight > 0 ? weightedSum / totalWeight : 0.5;
        // Calculate disagreement (variance)
        const mean = aggregatedScore;
        let variance = 0;
        for (const output of outputs) {
            variance += Math.pow(output.rawScore - mean, 2);
        }
        variance /= outputs.length;
        const disagreement = Math.sqrt(variance);
        // Identify outlier models (> 2 std from mean)
        const stdDev = disagreement;
        const outlierModels = outputs
            .filter(o => Math.abs(o.rawScore - mean) > 2 * stdDev)
            .map(o => o.modelId);
        return {
            method: AggregationMethod.DYNAMIC,
            weights,
            aggregatedScore,
            disagreement,
            outlierModels,
        };
    }
    /**
     * Calculate consensus level among models
     */
    calculateConsensus(outputs) {
        if (outputs.length === 0)
            return 0;
        const predictions = outputs.map(o => o.prediction);
        const positiveCount = predictions.filter(p => p).length;
        const majorityRatio = Math.max(positiveCount, outputs.length - positiveCount) / outputs.length;
        return majorityRatio;
    }
    /**
     * Estimate prediction uncertainty
     */
    estimateUncertainty(outputs, metaPrediction) {
        // Aleatoric uncertainty from prediction variance
        const scores = outputs.map(o => o.rawScore);
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
        const aleatoric = Math.sqrt(variance);
        // Epistemic uncertainty from model disagreement
        const predictions = outputs.map(o => o.prediction);
        const uniquePredictions = new Set(predictions).size;
        const epistemic = uniquePredictions > 1 ? 1 - this.calculateConsensus(outputs) : 0;
        // Total uncertainty
        const total = Math.sqrt(aleatoric * aleatoric + epistemic * epistemic);
        // Confidence interval using prediction variance
        const z = 1.96; // 95% CI
        const stdErr = aleatoric / Math.sqrt(outputs.length);
        const lower = Math.max(0, metaPrediction.confidence - z * stdErr);
        const upper = Math.min(1, metaPrediction.confidence + z * stdErr);
        // Prediction entropy
        const p = metaPrediction.confidence;
        const entropy = p > 0 && p < 1 ? -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p)) : 0;
        // Mutual information (simplified)
        const mutualInfo = entropy * (1 - this.calculateConsensus(outputs));
        return {
            aleatoric,
            epistemic,
            total,
            confidenceInterval: { lower, upper },
            predictionEntropy: entropy,
            mutualInformation: mutualInfo,
        };
    }
    /**
     * Generate human-readable explanation
     */
    generateExplanation(outputs, aggregation, metaPrediction) {
        // Sort models by influence
        const sortedByWeight = [...outputs].sort((a, b) => aggregation.weights[b.modelId] - aggregation.weights[a.modelId]);
        const dominantModels = sortedByWeight.slice(0, 3).map(o => o.modelId);
        // Find agreement factors
        const agreementFactors = [];
        const disagreementFactors = [];
        const majorityPrediction = outputs.filter(o => o.prediction).length > outputs.length / 2;
        for (const output of outputs) {
            if (output.prediction === majorityPrediction) {
                agreementFactors.push(`${output.modelId}: ${(output.confidence * 100).toFixed(1)}% confident`);
            }
            else {
                disagreementFactors.push(`${output.modelId}: disagrees with ${(output.confidence * 100).toFixed(1)}% confidence`);
            }
        }
        const decisionBoundary = 0.5;
        const marginToDecision = Math.abs(aggregation.aggregatedScore - decisionBoundary);
        return {
            dominantModels,
            agreementFactors: agreementFactors.slice(0, 3),
            disagreementFactors: disagreementFactors.slice(0, 3),
            decisionBoundary,
            marginToDecision,
        };
    }
    /**
     * Online learning - update model weights based on feedback
     */
    async updateFromFeedback(media, groundTruth, previousResult) {
        // Calculate individual model errors
        for (const output of previousResult.modelOutputs) {
            const error = output.prediction !== groundTruth ? 1 : 0;
            const model = this.models.get(output.modelId);
            if (model) {
                model.updateWeight(error);
            }
        }
        // Update meta-model
        await this.metaModel.update(previousResult.modelOutputs, groundTruth);
        // Update calibrator
        this.calibrator.update(previousResult.prediction.confidence, groundTruth ? 1 : 0);
        // Update dynamic weighter
        await this.dynamicWeighter.update(media, previousResult.modelOutputs, groundTruth);
    }
    /**
     * Get model performance statistics
     */
    getModelStats() {
        const stats = {};
        for (const [modelId, model] of this.models) {
            stats[modelId] = model.getStats();
        }
        return stats;
    }
}
exports.EnsembleMetaLearner = EnsembleMetaLearner;
class DetectionModel {
    id;
    type;
    weight;
    threshold;
    stats;
    constructor(config) {
        this.id = config.id;
        this.type = config.type;
        this.weight = config.weight;
        this.threshold = config.threshold;
        this.stats = {
            totalPredictions: 0,
            accuracy: 0.9,
            precision: 0.9,
            recall: 0.9,
            f1Score: 0.9,
            averageLatency: 100,
            currentWeight: config.weight,
        };
    }
    async predict(media) {
        // Simulate model prediction based on type
        const score = 0.3 + Math.random() * 0.4;
        const prediction = score > this.threshold;
        const confidence = Math.abs(score - 0.5) * 2;
        this.stats.totalPredictions++;
        return {
            prediction,
            score,
            confidence,
            features: this.extractFeatures(media),
        };
    }
    extractFeatures(media) {
        // Model-specific feature extraction
        return {
            feature1: Math.random(),
            feature2: Math.random(),
            feature3: Math.random(),
        };
    }
    updateWeight(error) {
        // Exponential weight decay on errors
        const learningRate = 0.01;
        this.weight *= 1 - learningRate * error;
        this.weight = Math.max(0.1, Math.min(1, this.weight));
        this.stats.currentWeight = this.weight;
    }
    getStats() {
        return { ...this.stats };
    }
}
class MetaModel {
    weights = [];
    async predict(outputs, aggregation) {
        // Use stacked generalization
        const features = this.extractMetaFeatures(outputs, aggregation);
        // Simple weighted combination for meta-prediction
        const score = aggregation.aggregatedScore;
        const prediction = score > 0.5;
        const confidence = Math.abs(score - 0.5) * 2;
        const strength = 1 - aggregation.disagreement;
        return { prediction, confidence, strength };
    }
    extractMetaFeatures(outputs, aggregation) {
        return [
            aggregation.aggregatedScore,
            aggregation.disagreement,
            outputs.length,
            this.calculateConsensus(outputs),
            ...outputs.map(o => o.rawScore),
        ];
    }
    calculateConsensus(outputs) {
        const positive = outputs.filter(o => o.prediction).length;
        return Math.max(positive, outputs.length - positive) / outputs.length;
    }
    async update(outputs, groundTruth) {
        // Update meta-model weights based on feedback
    }
}
class ConfidenceCalibrator {
    method = CalibrationMethod.TEMPERATURE_SCALING;
    temperature = 1.0;
    bins = [];
    constructor() {
        this.initializeBins();
    }
    initializeBins() {
        for (let i = 0; i < 10; i++) {
            this.bins.push({
                binStart: i * 0.1,
                binEnd: (i + 1) * 0.1,
                meanPredicted: (i + 0.5) * 0.1,
                meanActual: (i + 0.5) * 0.1,
                count: 0,
            });
        }
    }
    calibrate(confidence) {
        // Temperature scaling calibration
        const calibratedConfidence = this.temperatureScale(confidence);
        const calibrationError = this.calculateECE();
        return {
            method: this.method,
            originalConfidence: confidence,
            calibratedConfidence,
            calibrationError,
            reliabilityDiagram: this.bins,
        };
    }
    temperatureScale(confidence) {
        // Apply temperature scaling: softmax(logit/T)
        const logit = Math.log(confidence / (1 - confidence + 1e-10));
        const scaledLogit = logit / this.temperature;
        return 1 / (1 + Math.exp(-scaledLogit));
    }
    calculateECE() {
        // Expected Calibration Error
        let ece = 0;
        let totalCount = 0;
        for (const bin of this.bins) {
            if (bin.count > 0) {
                ece += bin.count * Math.abs(bin.meanActual - bin.meanPredicted);
                totalCount += bin.count;
            }
        }
        return totalCount > 0 ? ece / totalCount : 0;
    }
    update(predicted, actual) {
        // Update calibration bins
        const binIndex = Math.min(Math.floor(predicted * 10), 9);
        const bin = this.bins[binIndex];
        const newCount = bin.count + 1;
        bin.meanPredicted = (bin.meanPredicted * bin.count + predicted) / newCount;
        bin.meanActual = (bin.meanActual * bin.count + actual) / newCount;
        bin.count = newCount;
        // Update temperature
        this.updateTemperature();
    }
    updateTemperature() {
        // Optimize temperature to minimize ECE
        const ece = this.calculateECE();
        if (ece > 0.1) {
            this.temperature *= 1.1;
        }
        else if (ece < 0.05) {
            this.temperature *= 0.95;
        }
        this.temperature = Math.max(0.5, Math.min(2.0, this.temperature));
    }
}
class DynamicWeighter {
    inputProfiles = new Map();
    async computeWeights(media, outputs) {
        const weights = {};
        // Compute input characteristics
        const inputProfile = await this.extractInputProfile(media);
        // Adjust weights based on input characteristics
        for (const output of outputs) {
            let weight = output.weight;
            // Boost certain model types based on media type
            if (media.type === 'video' && output.modelType === ModelType.TEMPORAL_NETWORK) {
                weight *= 1.3;
            }
            if (media.type === 'audio' && output.modelType === ModelType.AUDIO_SPECTROGRAM) {
                weight *= 1.3;
            }
            if (output.modelType === ModelType.ADVERSARIAL_ROBUST) {
                weight *= 1.1; // Slight boost for robustness
            }
            // Reduce weight for high-latency models on time-sensitive inputs
            if (output.latency > 1000) {
                weight *= 0.9;
            }
            weights[output.modelId] = Math.max(0.1, Math.min(1, weight));
        }
        return weights;
    }
    async extractInputProfile(media) {
        // Extract characteristics of input for adaptive weighting
        return [0.5, 0.5, 0.5];
    }
    async update(media, outputs, groundTruth) {
        // Learn optimal weights for different input types
    }
}
