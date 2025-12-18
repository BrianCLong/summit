import { v4 as uuidv4 } from 'uuid';
import {
  BehavioralProfile,
  calculateDelta,
  cloneProfile,
} from '../models/BehavioralProfile.js';
import {
  EvolutionStep,
  FutureTrajectory,
  Scenario,
  SimulatedEvent,
} from '../models/FutureTrajectory.js';
import { SyntheticPersona } from '../models/SyntheticPersona.js';
import { getActivePressures, PressureVector } from '../models/EnvironmentalPressure.js';
import { evolveBehavior } from './BehaviorEvolver.js';

/**
 * Simulates a future trajectory for a synthetic persona under a specific scenario
 */
export function simulateTrajectory(
  persona: SyntheticPersona,
  scenario: Scenario,
  parentTrajectoryId?: string,
  branchPoint?: number,
): FutureTrajectory {
  const steps: EvolutionStep[] = [];
  let currentState = cloneProfile(persona.baselineProfile);

  // If branching from parent, start from branch point state
  if (branchPoint !== undefined && branchPoint > 0) {
    // In a real implementation, we'd load the parent trajectory state
    // For now, we'll start from baseline
  }

  // Simulate forward in monthly increments
  for (let t = 0; t <= scenario.timeHorizon; t++) {
    // Get pressures active at this time
    const activePressures = getActivePressures(scenario.pressures, t);

    // Evolve behavioral state based on pressures
    const nextState = evolveBehavior(
      currentState,
      activePressures,
      persona.mutationRate,
      persona.stabilityCoefficient,
    );

    // Calculate delta from baseline
    const delta = calculateDelta(nextState, persona.baselineProfile);

    // Generate simulated events for this step
    const events = generateSimulatedEvents(
      t,
      currentState,
      nextState,
      activePressures,
    );

    // Record evolution step
    steps.push({
      time: t,
      state: cloneProfile(nextState),
      pressuresApplied: activePressures,
      deltaFromBaseline: delta,
      events,
    });

    currentState = nextState;
  }

  const trajectory: FutureTrajectory = {
    id: uuidv4(),
    personaId: persona.id,
    scenarioId: scenario.id,
    timeHorizon: scenario.timeHorizon,
    steps,
    finalState: currentState,
    likelihood: 0.5, // Will be calculated by LikelihoodScorer
    metadata: {
      simulatedAt: Date.now(),
      branchPoint,
      parentTrajectoryId,
    },
  };

  return trajectory;
}

/**
 * Simulates multiple trajectories for different scenarios
 */
export function simulateMultipleTrajectories(
  persona: SyntheticPersona,
  scenarios: Scenario[],
): FutureTrajectory[] {
  return scenarios.map((scenario) => simulateTrajectory(persona, scenario));
}

/**
 * Creates branching trajectories from a parent trajectory
 */
export function createBranchingTrajectories(
  persona: SyntheticPersona,
  parentTrajectory: FutureTrajectory,
  branchPoint: number,
  newScenarios: Scenario[],
): FutureTrajectory[] {
  return newScenarios.map((scenario) =>
    simulateTrajectory(persona, scenario, parentTrajectory.id, branchPoint),
  );
}

/**
 * Generates simulated events based on state transitions
 */
function generateSimulatedEvents(
  time: number,
  prevState: BehavioralProfile,
  newState: BehavioralProfile,
  pressures: PressureVector[],
): SimulatedEvent[] {
  const events: SimulatedEvent[] = [];

  // Generate events based on significant state changes
  const activityChange = Math.abs(newState.activityLevel - prevState.activityLevel);
  if (activityChange > 0.2) {
    events.push({
      type: 'ACTIVITY_SHIFT',
      description:
        newState.activityLevel > prevState.activityLevel
          ? 'Significant increase in activity level'
          : 'Significant decrease in activity level',
      time,
      probability: Math.min(0.9, activityChange * 2),
      involvedEntities: [],
    });
  }

  const riskChange = Math.abs(newState.riskTolerance - prevState.riskTolerance);
  if (riskChange > 0.25) {
    events.push({
      type: 'RISK_ADAPTATION',
      description:
        newState.riskTolerance > prevState.riskTolerance
          ? 'Increased risk-taking behavior'
          : 'Risk-averse adaptation',
      time,
      probability: Math.min(0.85, riskChange * 2),
      involvedEntities: [],
    });
  }

  const alignmentChange = Math.abs(newState.alignmentShift - prevState.alignmentShift);
  if (alignmentChange > 0.3) {
    events.push({
      type: 'ALIGNMENT_SHIFT',
      description: 'Major shift in strategic alignment',
      time,
      probability: Math.min(0.8, alignmentChange * 1.5),
      involvedEntities: [],
    });
  }

  const networkChange = Math.abs(newState.networkExpansion - prevState.networkExpansion);
  if (networkChange > 0.3) {
    events.push({
      type: 'NETWORK_EVOLUTION',
      description:
        newState.networkExpansion > prevState.networkExpansion
          ? 'Network expansion activity'
          : 'Network contraction or isolation',
      time,
      probability: Math.min(0.75, networkChange * 2),
      involvedEntities: [],
    });
  }

  const capabilityChange = Math.abs(
    newState.capabilityAcquisition - prevState.capabilityAcquisition,
  );
  if (capabilityChange > 0.25) {
    events.push({
      type: 'CAPABILITY_CHANGE',
      description: 'Capability acquisition or loss',
      time,
      probability: Math.min(0.7, capabilityChange * 2),
      involvedEntities: [],
    });
  }

  // Generate events based on active pressures
  for (const pressure of pressures) {
    if (pressure.strength > 0.6) {
      events.push({
        type: `${pressure.type}_PRESSURE_RESPONSE`,
        description: `Response to high ${pressure.type.toLowerCase()} pressure`,
        time,
        probability: pressure.strength * 0.8,
        involvedEntities: pressure.source ? [pressure.source] : [],
      });
    }
  }

  return events;
}

/**
 * Extends an existing trajectory with additional time steps
 */
export function extendTrajectory(
  persona: SyntheticPersona,
  existingTrajectory: FutureTrajectory,
  additionalMonths: number,
  scenario: Scenario,
): FutureTrajectory {
  const steps = [...existingTrajectory.steps];
  let currentState = cloneProfile(existingTrajectory.finalState);
  const startTime = existingTrajectory.timeHorizon;

  for (let t = startTime + 1; t <= startTime + additionalMonths; t++) {
    const activePressures = getActivePressures(scenario.pressures, t);

    const nextState = evolveBehavior(
      currentState,
      activePressures,
      persona.mutationRate,
      persona.stabilityCoefficient,
    );

    const delta = calculateDelta(nextState, persona.baselineProfile);
    const events = generateSimulatedEvents(
      t,
      currentState,
      nextState,
      activePressures,
    );

    steps.push({
      time: t,
      state: cloneProfile(nextState),
      pressuresApplied: activePressures,
      deltaFromBaseline: delta,
      events,
    });

    currentState = nextState;
  }

  return {
    ...existingTrajectory,
    timeHorizon: startTime + additionalMonths,
    steps,
    finalState: currentState,
    metadata: {
      ...existingTrajectory.metadata,
      simulatedAt: Date.now(),
    },
  };
}

/**
 * Interpolates between two trajectories to create a blended path
 */
export function interpolateTrajectories(
  trajectory1: FutureTrajectory,
  trajectory2: FutureTrajectory,
  blendFactor: number, // 0.0 to 1.0
): FutureTrajectory {
  const minLength = Math.min(trajectory1.steps.length, trajectory2.steps.length);
  const steps: EvolutionStep[] = [];

  for (let i = 0; i < minLength; i++) {
    const step1 = trajectory1.steps[i];
    const step2 = trajectory2.steps[i];

    const blendedState: BehavioralProfile = {
      activityLevel:
        step1.state.activityLevel * (1 - blendFactor) +
        step2.state.activityLevel * blendFactor,
      operationalTempo:
        step1.state.operationalTempo * (1 - blendFactor) +
        step2.state.operationalTempo * blendFactor,
      riskTolerance:
        step1.state.riskTolerance * (1 - blendFactor) +
        step2.state.riskTolerance * blendFactor,
      alignmentShift:
        step1.state.alignmentShift * (1 - blendFactor) +
        step2.state.alignmentShift * blendFactor,
      resourceSeeking:
        step1.state.resourceSeeking * (1 - blendFactor) +
        step2.state.resourceSeeking * blendFactor,
      capabilityAcquisition:
        step1.state.capabilityAcquisition * (1 - blendFactor) +
        step2.state.capabilityAcquisition * blendFactor,
      networkExpansion:
        step1.state.networkExpansion * (1 - blendFactor) +
        step2.state.networkExpansion * blendFactor,
      trustRadius:
        step1.state.trustRadius * (1 - blendFactor) +
        step2.state.trustRadius * blendFactor,
      influenceSeeking:
        step1.state.influenceSeeking * (1 - blendFactor) +
        step2.state.influenceSeeking * blendFactor,
      tacticalInnovation:
        step1.state.tacticalInnovation * (1 - blendFactor) +
        step2.state.tacticalInnovation * blendFactor,
      stabilityCoefficient:
        step1.state.stabilityCoefficient * (1 - blendFactor) +
        step2.state.stabilityCoefficient * blendFactor,
    };

    const delta = calculateDelta(
      blendedState,
      trajectory1.steps[0].state, // Use initial state as baseline
    );

    steps.push({
      time: step1.time,
      state: blendedState,
      pressuresApplied: [...step1.pressuresApplied, ...step2.pressuresApplied],
      deltaFromBaseline: delta,
      events: [...step1.events, ...step2.events],
    });
  }

  return {
    id: uuidv4(),
    personaId: trajectory1.personaId,
    scenarioId: `blended_${trajectory1.scenarioId}_${trajectory2.scenarioId}`,
    timeHorizon: minLength - 1,
    steps,
    finalState: steps[steps.length - 1].state,
    likelihood: (trajectory1.likelihood + trajectory2.likelihood) / 2,
    metadata: {
      simulatedAt: Date.now(),
    },
  };
}
