"use strict";
/**
 * Ensemble scoring utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateEnsembleScore = calculateEnsembleScore;
exports.calculateConfidenceInterval = calculateConfidenceInterval;
exports.temperatureScale = temperatureScale;
const index_js_1 = require("../constants/index.js");
/**
 * Calculate ensemble score from multiple detections
 */
function calculateEnsembleScore(input) {
    const { detections, method = 'WEIGHTED_AVERAGE', customWeights, threshold = 0.5 } = input;
    if (detections.length === 0) {
        throw new Error('No detections provided for ensemble');
    }
    // Extract scores by detector type
    const scoresByType = {};
    for (const detection of detections) {
        scoresByType[detection.detectorType] = detection.confidenceScore;
    }
    // Calculate final score based on voting method
    let finalConfidence;
    switch (method) {
        case 'WEIGHTED_AVERAGE':
            finalConfidence = weightedAverage(scoresByType, customWeights);
            break;
        case 'MAJORITY_VOTE':
            finalConfidence = majorityVote(scoresByType, threshold);
            break;
        case 'MAX_CONFIDENCE':
            finalConfidence = maxConfidence(scoresByType);
            break;
        case 'UNANIMOUS':
            finalConfidence = unanimous(scoresByType, threshold);
            break;
        default:
            throw new Error(`Unknown voting method: ${method}`);
    }
    // Determine if synthetic based on threshold
    const isSynthetic = finalConfidence >= threshold;
    // Extract individual modality scores
    const videoConfidence = getModalityScore(scoresByType, [
        'VIDEO_FACE',
        'VIDEO_GENERIC',
    ]);
    const audioConfidence = getModalityScore(scoresByType, [
        'AUDIO_SPECTROGRAM',
        'AUDIO_WAVEFORM',
    ]);
    const imageConfidence = getModalityScore(scoresByType, [
        'IMAGE_MANIPULATION',
        'IMAGE_GAN',
    ]);
    return {
        id: generateEnsembleId(detections[0].mediaId),
        mediaId: detections[0].mediaId,
        finalConfidence,
        isSynthetic,
        videoConfidence,
        audioConfidence,
        imageConfidence,
        votingMethod: method,
        componentDetectionIds: detections.map((d) => d.id),
        weights: customWeights || getDefaultWeights(),
        createdAt: new Date(),
    };
}
/**
 * Weighted average voting
 */
function weightedAverage(scores, customWeights) {
    const weights = customWeights || index_js_1.ENSEMBLE_WEIGHTS;
    let weightedSum = 0;
    let totalWeight = 0;
    for (const [detectorType, score] of Object.entries(scores)) {
        const weight = weights[detectorType] || 0;
        weightedSum += score * weight;
        totalWeight += weight;
    }
    if (totalWeight === 0) {
        throw new Error('Total weight is zero, cannot calculate weighted average');
    }
    return weightedSum / totalWeight;
}
/**
 * Majority vote (percentage of detectors above threshold)
 */
function majorityVote(scores, threshold) {
    const totalDetectors = Object.keys(scores).length;
    const positiveVotes = Object.values(scores).filter((s) => s >= threshold).length;
    return positiveVotes / totalDetectors;
}
/**
 * Max confidence (highest score wins)
 */
function maxConfidence(scores) {
    return Math.max(...Object.values(scores));
}
/**
 * Unanimous (all detectors must agree above threshold)
 */
function unanimous(scores, threshold) {
    const allPositive = Object.values(scores).every((s) => s >= threshold);
    return allPositive ? 1.0 : 0.0;
}
/**
 * Get aggregate score for a modality (e.g., video, audio)
 */
function getModalityScore(scores, detectorTypes) {
    const modalityScores = detectorTypes
        .map((type) => scores[type])
        .filter((s) => s !== undefined);
    if (modalityScores.length === 0) {
        return undefined;
    }
    // Return average of available detectors for this modality
    return modalityScores.reduce((a, b) => a + b, 0) / modalityScores.length;
}
/**
 * Get default ensemble weights
 */
function getDefaultWeights() {
    return { ...index_js_1.ENSEMBLE_WEIGHTS };
}
/**
 * Generate ensemble result ID
 */
function generateEnsembleId(mediaId) {
    return `ensemble-${mediaId}-${Date.now()}`;
}
/**
 * Calculate confidence intervals (bootstrapping)
 */
function calculateConfidenceInterval(scores, confidenceLevel = 0.95, numBootstrap = 1000) {
    const bootstrapMeans = [];
    for (let i = 0; i < numBootstrap; i++) {
        const sample = bootstrapSample(scores);
        const mean = sample.reduce((a, b) => a + b, 0) / sample.length;
        bootstrapMeans.push(mean);
    }
    bootstrapMeans.sort((a, b) => a - b);
    const alpha = 1 - confidenceLevel;
    const lowerIndex = Math.floor(alpha / 2 * numBootstrap);
    const upperIndex = Math.floor((1 - alpha / 2) * numBootstrap);
    return {
        lower: bootstrapMeans[lowerIndex],
        upper: bootstrapMeans[upperIndex],
        mean: scores.reduce((a, b) => a + b, 0) / scores.length,
    };
}
/**
 * Bootstrap sample (sampling with replacement)
 */
function bootstrapSample(arr) {
    const sample = [];
    for (let i = 0; i < arr.length; i++) {
        const randomIndex = Math.floor(Math.random() * arr.length);
        sample.push(arr[randomIndex]);
    }
    return sample;
}
/**
 * Calibrate confidence scores using temperature scaling
 */
function temperatureScale(confidence, temperature = 1.0) {
    if (temperature <= 0) {
        throw new Error('Temperature must be positive');
    }
    // Apply temperature scaling to logits
    const logit = Math.log(confidence / (1 - confidence));
    const scaledLogit = logit / temperature;
    // Convert back to probability
    return 1 / (1 + Math.exp(-scaledLogit));
}
