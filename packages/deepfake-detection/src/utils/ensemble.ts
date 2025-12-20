/**
 * Ensemble scoring utilities
 */

import { ENSEMBLE_WEIGHTS } from '../constants/index.js';
import type {
  DeepfakeDetection,
  DetectorType,
  EnsembleResult,
  VotingMethod,
} from '../types/index.js';

export interface EnsembleInput {
  detections: DeepfakeDetection[];
  method?: VotingMethod;
  customWeights?: Record<DetectorType, number>;
  threshold?: number;
}

/**
 * Calculate ensemble score from multiple detections
 */
export function calculateEnsembleScore(input: EnsembleInput): EnsembleResult {
  const { detections, method = 'WEIGHTED_AVERAGE', customWeights, threshold = 0.5 } = input;

  if (detections.length === 0) {
    throw new Error('No detections provided for ensemble');
  }

  // Extract scores by detector type
  const scoresByType: Record<string, number> = {};
  for (const detection of detections) {
    scoresByType[detection.detectorType] = detection.confidenceScore;
  }

  // Calculate final score based on voting method
  let finalConfidence: number;

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
function weightedAverage(
  scores: Record<string, number>,
  customWeights?: Record<string, number>,
): number {
  const weights = customWeights || ENSEMBLE_WEIGHTS;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [detectorType, score] of Object.entries(scores)) {
    const weight = weights[detectorType as DetectorType] || 0;
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
function majorityVote(scores: Record<string, number>, threshold: number): number {
  const totalDetectors = Object.keys(scores).length;
  const positiveVotes = Object.values(scores).filter((s) => s >= threshold).length;

  return positiveVotes / totalDetectors;
}

/**
 * Max confidence (highest score wins)
 */
function maxConfidence(scores: Record<string, number>): number {
  return Math.max(...Object.values(scores));
}

/**
 * Unanimous (all detectors must agree above threshold)
 */
function unanimous(scores: Record<string, number>, threshold: number): number {
  const allPositive = Object.values(scores).every((s) => s >= threshold);
  return allPositive ? 1.0 : 0.0;
}

/**
 * Get aggregate score for a modality (e.g., video, audio)
 */
function getModalityScore(
  scores: Record<string, number>,
  detectorTypes: string[],
): number | undefined {
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
function getDefaultWeights(): Record<DetectorType, number> {
  return { ...ENSEMBLE_WEIGHTS } as Record<DetectorType, number>;
}

/**
 * Generate ensemble result ID
 */
function generateEnsembleId(mediaId: string): string {
  return `ensemble-${mediaId}-${Date.now()}`;
}

/**
 * Calculate confidence intervals (bootstrapping)
 */
export function calculateConfidenceInterval(
  scores: number[],
  confidenceLevel: number = 0.95,
  numBootstrap: number = 1000,
): { lower: number; upper: number; mean: number } {
  const bootstrapMeans: number[] = [];

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
function bootstrapSample<T>(arr: T[]): T[] {
  const sample: T[] = [];
  for (let i = 0; i < arr.length; i++) {
    const randomIndex = Math.floor(Math.random() * arr.length);
    sample.push(arr[randomIndex]);
  }
  return sample;
}

/**
 * Calibrate confidence scores using temperature scaling
 */
export function temperatureScale(
  confidence: number,
  temperature: number = 1.0,
): number {
  if (temperature <= 0) {
    throw new Error('Temperature must be positive');
  }

  // Apply temperature scaling to logits
  const logit = Math.log(confidence / (1 - confidence));
  const scaledLogit = logit / temperature;

  // Convert back to probability
  return 1 / (1 + Math.exp(-scaledLogit));
}
