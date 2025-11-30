import { BehavioralDelta, BehavioralProfile } from './BehavioralProfile.js';
import { PressureVector } from './EnvironmentalPressure.js';

export interface FutureTrajectory {
  id: string;
  personaId: string;
  scenarioId: string;
  timeHorizon: number; // months
  steps: EvolutionStep[];
  finalState: BehavioralProfile;
  likelihood: number; // 0.0 - 1.0
  metadata: TrajectoryMetadata;
}

export interface TrajectoryMetadata {
  simulatedAt: number;
  branchPoint?: number;
  parentTrajectoryId?: string;
}

export interface EvolutionStep {
  time: number; // months from T0
  state: BehavioralProfile;
  pressuresApplied: PressureVector[];
  deltaFromBaseline: BehavioralDelta;
  events: SimulatedEvent[];
}

export interface SimulatedEvent {
  type: string;
  description: string;
  time: number;
  probability: number;
  involvedEntities: string[];
}

export interface Scenario {
  id: string;
  name: string;
  timeHorizon: number;
  pressures: PressureVector[];
}

/**
 * Validates a future trajectory
 */
export function validateTrajectory(trajectory: FutureTrajectory): boolean {
  if (!trajectory.id || !trajectory.personaId || !trajectory.scenarioId) {
    return false;
  }

  if (trajectory.timeHorizon <= 0) {
    return false;
  }

  if (trajectory.likelihood < 0 || trajectory.likelihood > 1) {
    return false;
  }

  if (!trajectory.steps || trajectory.steps.length === 0) {
    return false;
  }

  return true;
}

/**
 * Gets the state at a specific time offset
 */
export function getStateAtTime(
  trajectory: FutureTrajectory,
  time: number,
): BehavioralProfile | null {
  const step = trajectory.steps.find((s) => s.time === time);
  return step ? step.state : null;
}

/**
 * Gets all pressures active at a specific time
 */
export function getPressuresAtTime(
  trajectory: FutureTrajectory,
  time: number,
): PressureVector[] {
  const step = trajectory.steps.find((s) => s.time === time);
  return step ? step.pressuresApplied : [];
}

/**
 * Calculates total divergence from baseline across trajectory
 */
export function calculateTotalDivergence(
  trajectory: FutureTrajectory,
): number {
  let totalDivergence = 0;

  for (const step of trajectory.steps) {
    const delta = step.deltaFromBaseline;
    const stepDivergence =
      Math.abs(delta.activityLevel) +
      Math.abs(delta.operationalTempo) / 10 +
      Math.abs(delta.riskTolerance) +
      Math.abs(delta.alignmentShift) +
      Math.abs(delta.resourceSeeking) +
      Math.abs(delta.capabilityAcquisition) +
      Math.abs(delta.networkExpansion) +
      Math.abs(delta.trustRadius) / 10 +
      Math.abs(delta.influenceSeeking) +
      Math.abs(delta.tacticalInnovation);

    totalDivergence += stepDivergence;
  }

  return totalDivergence / trajectory.steps.length;
}

/**
 * Finds the time of maximum divergence from baseline
 */
export function findMaxDivergenceTime(
  trajectory: FutureTrajectory,
): { time: number; divergence: number } {
  let maxDivergence = 0;
  let maxTime = 0;

  for (const step of trajectory.steps) {
    const delta = step.deltaFromBaseline;
    const divergence =
      Math.abs(delta.activityLevel) +
      Math.abs(delta.operationalTempo) / 10 +
      Math.abs(delta.riskTolerance) +
      Math.abs(delta.alignmentShift) +
      Math.abs(delta.resourceSeeking) +
      Math.abs(delta.capabilityAcquisition) +
      Math.abs(delta.networkExpansion) +
      Math.abs(delta.trustRadius) / 10 +
      Math.abs(delta.influenceSeeking) +
      Math.abs(delta.tacticalInnovation);

    if (divergence > maxDivergence) {
      maxDivergence = divergence;
      maxTime = step.time;
    }
  }

  return { time: maxTime, divergence: maxDivergence };
}
