import {
  BehavioralProfile,
  calculateDistance,
} from '../models/BehavioralProfile.js';
import { FutureTrajectory } from '../models/FutureTrajectory.js';
import { SyntheticPersona } from '../models/SyntheticPersona.js';

export interface HistoricalPattern {
  id: string;
  entityType: string;
  initialState: BehavioralProfile;
  finalState: BehavioralProfile;
  timeElapsed: number;
  context: string[];
}

export interface LikelihoodComponents {
  historicalScore: number;
  coherenceScore: number;
  realismScore: number;
  divergencePenalty: number;
}

/**
 * Scores the likelihood of a trajectory
 */
export function scoreTrajectoryLikelihood(
  trajectory: FutureTrajectory,
  persona: SyntheticPersona,
  historicalPatterns: HistoricalPattern[] = [],
): number {
  const components = calculateLikelihoodComponents(
    trajectory,
    persona,
    historicalPatterns,
  );

  // Weighted combination
  const overallLikelihood =
    components.historicalScore * 0.35 +
    components.coherenceScore * 0.25 +
    components.realismScore * 0.30 +
    (1 - components.divergencePenalty) * 0.10;

  return Math.max(0, Math.min(1, overallLikelihood));
}

/**
 * Calculates all likelihood components
 */
export function calculateLikelihoodComponents(
  trajectory: FutureTrajectory,
  persona: SyntheticPersona,
  historicalPatterns: HistoricalPattern[] = [],
): LikelihoodComponents {
  return {
    historicalScore: calculateHistoricalSimilarity(
      trajectory,
      historicalPatterns,
    ),
    coherenceScore: calculateCoherence(trajectory),
    realismScore: calculatePressureRealism(trajectory, persona),
    divergencePenalty: calculateDivergencePenalty(
      trajectory,
      persona.baselineProfile,
    ),
  };
}

/**
 * Calculates historical similarity score
 */
export function calculateHistoricalSimilarity(
  trajectory: FutureTrajectory,
  historicalPatterns: HistoricalPattern[],
): number {
  if (historicalPatterns.length === 0) {
    return 0.5; // Neutral score if no historical data
  }

  const initialState = trajectory.steps[0]?.state || trajectory.finalState;
  const finalState = trajectory.finalState;

  // Find most similar historical patterns
  const similarities = historicalPatterns.map((pattern) => {
    // Compare initial states
    const initialSimilarity =
      1 / (1 + calculateDistance(initialState, pattern.initialState));

    // Compare final states
    const finalSimilarity =
      1 / (1 + calculateDistance(finalState, pattern.finalState));

    // Compare time elapsed
    const timeRatio = trajectory.timeHorizon / pattern.timeElapsed;
    const timeSimilarity = 1 / (1 + Math.abs(Math.log(timeRatio)));

    // Weighted average
    return initialSimilarity * 0.3 + finalSimilarity * 0.5 + timeSimilarity * 0.2;
  });

  // Return average of top 3 most similar patterns
  const topSimilarities = similarities.sort((a, b) => b - a).slice(0, 3);
  return topSimilarities.reduce((sum, s) => sum + s, 0) / topSimilarities.length;
}

/**
 * Calculates internal coherence of trajectory
 */
export function calculateCoherence(trajectory: FutureTrajectory): number {
  if (trajectory.steps.length < 2) {
    return 1.0; // Perfect coherence for single step
  }

  let coherenceSum = 0;
  let stepCount = 0;

  // Check for smooth transitions between steps
  for (let i = 1; i < trajectory.steps.length; i++) {
    const prevState = trajectory.steps[i - 1].state;
    const currState = trajectory.steps[i].state;

    // Calculate step-to-step change magnitude
    const stepChange = calculateDistance(prevState, currState);

    // Penalize large jumps (incoherent transitions)
    const coherence = Math.exp(-stepChange * 2); // Exponential decay for large changes

    coherenceSum += coherence;
    stepCount++;
  }

  const avgCoherence = coherenceSum / stepCount;

  // Additional coherence checks
  const dimensionalCoherence = checkDimensionalCoherence(trajectory);
  const eventCoherence = checkEventCoherence(trajectory);

  return avgCoherence * 0.5 + dimensionalCoherence * 0.3 + eventCoherence * 0.2;
}

/**
 * Checks for contradictory behavioral dimensions
 */
function checkDimensionalCoherence(trajectory: FutureTrajectory): number {
  let coherenceScore = 1.0;

  for (const step of trajectory.steps) {
    const state = step.state;

    // Check for contradictions
    // E.g., high risk tolerance but very low activity level
    if (state.riskTolerance > 0.7 && state.activityLevel < 0.3) {
      coherenceScore *= 0.8;
    }

    // High influence-seeking but network contraction
    if (state.influenceSeeking > 0.7 && state.networkExpansion < 0.2) {
      coherenceScore *= 0.85;
    }

    // High capability acquisition but low tactical innovation
    if (state.capabilityAcquisition > 0.7 && state.tacticalInnovation < 0.3) {
      coherenceScore *= 0.9;
    }

    // Very high operational tempo but low activity level
    if (state.operationalTempo > 5 && state.activityLevel < 0.4) {
      coherenceScore *= 0.85;
    }
  }

  return Math.max(0, coherenceScore);
}

/**
 * Checks coherence of simulated events
 */
function checkEventCoherence(trajectory: FutureTrajectory): number {
  let coherenceScore = 1.0;

  for (const step of trajectory.steps) {
    for (const event of step.events) {
      // Events should align with behavioral state changes
      if (event.type === 'ACTIVITY_SHIFT') {
        const activityDelta = step.deltaFromBaseline.activityLevel;
        if (Math.abs(activityDelta) < 0.1) {
          coherenceScore *= 0.9; // Event doesn't match state
        }
      }

      // Low probability events reduce coherence
      if (event.probability < 0.3) {
        coherenceScore *= 0.95;
      }
    }
  }

  return Math.max(0, coherenceScore);
}

/**
 * Calculates realism of pressure-response patterns
 */
export function calculatePressureRealism(
  trajectory: FutureTrajectory,
  persona: SyntheticPersona,
): number {
  if (trajectory.steps.length === 0) {
    return 0.5;
  }

  let realismSum = 0;

  for (const step of trajectory.steps) {
    const pressures = step.pressuresApplied;
    const state = step.state;

    if (pressures.length === 0) {
      realismSum += 0.8; // Moderate realism for no-pressure steps
      continue;
    }

    // Check if behavioral changes align with pressures
    let alignmentScore = 0;
    let pressureCount = 0;

    for (const pressure of pressures) {
      pressureCount++;

      switch (pressure.type) {
        case 'ECONOMIC':
          // Economic pressure should increase resource-seeking
          if (
            state.resourceSeeking >
            persona.baselineProfile.resourceSeeking + 0.1
          ) {
            alignmentScore += 1.0;
          } else {
            alignmentScore += 0.5;
          }
          break;

        case 'POLITICAL':
          // Political pressure should affect alignment and influence
          if (
            Math.abs(state.alignmentShift) >
              Math.abs(persona.baselineProfile.alignmentShift) ||
            state.influenceSeeking >
              persona.baselineProfile.influenceSeeking + 0.1
          ) {
            alignmentScore += 1.0;
          } else {
            alignmentScore += 0.5;
          }
          break;

        case 'SOCIAL':
          // Social pressure should affect network expansion
          if (
            state.networkExpansion >
            persona.baselineProfile.networkExpansion + 0.1
          ) {
            alignmentScore += 1.0;
          } else {
            alignmentScore += 0.5;
          }
          break;

        case 'TECHNOLOGICAL':
          // Tech pressure should increase capability acquisition
          if (
            state.capabilityAcquisition >
            persona.baselineProfile.capabilityAcquisition + 0.1
          ) {
            alignmentScore += 1.0;
          } else {
            alignmentScore += 0.5;
          }
          break;

        case 'OPERATIONAL':
          // Operational pressure should increase activity
          if (
            state.activityLevel > persona.baselineProfile.activityLevel + 0.1
          ) {
            alignmentScore += 1.0;
          } else {
            alignmentScore += 0.5;
          }
          break;
      }
    }

    realismSum += pressureCount > 0 ? alignmentScore / pressureCount : 0.8;
  }

  return realismSum / trajectory.steps.length;
}

/**
 * Calculates penalty for extreme divergence from baseline
 */
export function calculateDivergencePenalty(
  trajectory: FutureTrajectory,
  baseline: BehavioralProfile,
): number {
  const finalState = trajectory.finalState;
  const distance = calculateDistance(finalState, baseline);

  // Penalize large divergences using sigmoid function
  // Distances < 2.0 are acceptable, > 5.0 heavily penalized
  const normalizedDistance = distance / 5.0;
  const penalty = 1 / (1 + Math.exp(-5 * (normalizedDistance - 0.5)));

  return Math.max(0, Math.min(1, penalty));
}

/**
 * Updates trajectory likelihoods based on new evidence
 */
export function updateLikelihoodsWithEvidence(
  trajectories: FutureTrajectory[],
  observedState: BehavioralProfile,
  observationTime: number,
  confidence: number,
): FutureTrajectory[] {
  return trajectories.map((trajectory) => {
    // Find the closest time step to observation
    const closestStep = trajectory.steps.reduce((prev, curr) =>
      Math.abs(curr.time - observationTime) < Math.abs(prev.time - observationTime)
        ? curr
        : prev,
    );

    // Calculate how well this trajectory predicted the observation
    const predictionError = calculateDistance(
      closestStep.state,
      observedState,
    );

    // Update likelihood using Bayesian approach
    const evidenceFactor = Math.exp(-predictionError) * confidence;
    const updatedLikelihood =
      (trajectory.likelihood * evidenceFactor) /
      (trajectory.likelihood * evidenceFactor +
        (1 - trajectory.likelihood) * (1 - evidenceFactor));

    return {
      ...trajectory,
      likelihood: Math.max(0.01, Math.min(0.99, updatedLikelihood)),
    };
  });
}

/**
 * Normalizes likelihoods across a set of trajectories to sum to 1.0
 */
export function normalizeLikelihoods(
  trajectories: FutureTrajectory[],
): FutureTrajectory[] {
  const totalLikelihood = trajectories.reduce(
    (sum, t) => sum + t.likelihood,
    0,
  );

  if (totalLikelihood === 0) {
    // If all likelihoods are 0, assign equal probability
    const equalLikelihood = 1.0 / trajectories.length;
    return trajectories.map((t) => ({ ...t, likelihood: equalLikelihood }));
  }

  return trajectories.map((t) => ({
    ...t,
    likelihood: t.likelihood / totalLikelihood,
  }));
}
