import { PersonaEngine } from '../PersonaEngine.js';
import { calculateDistance } from '../models/BehavioralProfile.js';
import { FutureTrajectory, Scenario } from '../models/FutureTrajectory.js';
import { PressureVector } from '../models/EnvironmentalPressure.js';
import { calculateLikelihoodComponents } from '../algorithms/LikelihoodScorer.js';

export interface Context {
  personaEngine: PersonaEngine;
}

export const personaResolvers = {
  Query: {
    getPersona: async (_parent: any, { id }: { id: string }, context: Context) => {
      const engine = context.personaEngine;
      const personas = await engine.getPersonasForEntity(id);

      if (personas.length === 0) {
        // Try fetching directly by persona ID
        try {
          return await engine['fetchPersona'](id);
        } catch {
          return null;
        }
      }

      return personas[0];
    },

    getPersonasForEntity: async (
      _parent: any,
      { entityId }: { entityId: string },
      context: Context,
    ) => {
      return context.personaEngine.getPersonasForEntity(entityId);
    },

    getTrajectory: async (
      _parent: any,
      { id }: { id: string },
      context: Context,
    ) => {
      try {
        return await context.personaEngine['fetchTrajectory'](id);
      } catch {
        return null;
      }
    },

    getTrajectoriesForPersona: async (
      _parent: any,
      { personaId }: { personaId: string },
      context: Context,
    ) => {
      return context.personaEngine.getTrajectoriesForPersona(personaId);
    },

    compareFutures: async (
      _parent: any,
      { personaId, scenarios }: { personaId: string; scenarios: string[] },
      context: Context,
    ) => {
      const trajectories = await context.personaEngine.getTrajectoriesForPersona(
        personaId,
      );

      const filteredTrajectories = trajectories.filter((t) =>
        scenarios.includes(t.scenarioId),
      );

      // Calculate divergence metrics
      const divergence = calculateDivergenceMetrics(filteredTrajectories);

      return {
        personaId,
        scenarios,
        trajectories: filteredTrajectories,
        divergence,
      };
    },

    getLikelihoods: async (
      _parent: any,
      { personaId }: { personaId: string },
      context: Context,
    ) => {
      const trajectories = await context.personaEngine.getTrajectoriesForPersona(
        personaId,
      );

      const persona = await context.personaEngine['fetchPersona'](personaId);

      return trajectories.map((trajectory) => {
        const components = calculateLikelihoodComponents(
          trajectory,
          persona,
          [],
        );

        return {
          trajectoryId: trajectory.id,
          overallLikelihood: trajectory.likelihood,
          historicalScore: components.historicalScore,
          coherenceScore: components.coherenceScore,
          realismScore: components.realismScore,
          divergencePenalty: components.divergencePenalty,
          lastUpdated: new Date(trajectory.metadata.simulatedAt).toISOString(),
        };
      });
    },

    searchTrajectories: async (
      _parent: any,
      {
        minLikelihood,
        maxTimeHorizon,
        pressureTypes,
      }: {
        minLikelihood?: number;
        maxTimeHorizon?: number;
        pressureTypes?: string[];
      },
      context: Context,
    ) => {
      // This would need a more sophisticated Neo4j query in production
      // For now, we'll return an empty array as a placeholder
      return [];
    },
  },

  Mutation: {
    createPersona: async (
      _parent: any,
      { input }: { input: any },
      context: Context,
    ) => {
      const config = {
        mutationRate: input.mutationRate,
        branchingFactor: input.branchingFactor,
        validityWindow: input.validityWindow
          ? input.validityWindow * 30 * 24 * 60 * 60 * 1000
          : undefined,
      };

      return context.personaEngine.createPersona(input.sourceEntityId, config);
    },

    simulateFuture: async (
      _parent: any,
      { personaId, scenario }: { personaId: string; scenario: any },
      context: Context,
    ) => {
      const scenarioObj: Scenario = {
        id: scenario.id,
        name: scenario.name,
        timeHorizon: scenario.timeHorizon,
        pressures: scenario.pressures.map(
          (p: any): PressureVector => ({
            type: p.type,
            strength: p.strength,
            duration: p.duration,
            decay: p.decay || 0.1,
            source: p.source,
            onset: p.onset,
          }),
        ),
      };

      return context.personaEngine.simulateFuture(personaId, scenarioObj);
    },

    applyPressure: async (
      _parent: any,
      { trajectoryId, pressure }: { trajectoryId: string; pressure: any },
      context: Context,
    ) => {
      const pressureVector: PressureVector = {
        type: pressure.type,
        strength: pressure.strength,
        duration: pressure.duration,
        decay: pressure.decay || 0.1,
        source: pressure.source,
        onset: pressure.onset,
      };

      return context.personaEngine.applyPressure(trajectoryId, pressureVector);
    },

    updateLikelihoods: async (
      _parent: any,
      { personaId, evidence }: { personaId: string; evidence: any },
      context: Context,
    ) => {
      const observedState = evidence.observedBehavior;
      const trajectories = await context.personaEngine.updateLikelihoods(
        personaId,
        observedState,
        evidence.observationTime,
        evidence.confidence,
      );

      const persona = await context.personaEngine['fetchPersona'](personaId);

      return trajectories.map((trajectory) => {
        const components = calculateLikelihoodComponents(
          trajectory,
          persona,
          [],
        );

        return {
          trajectoryId: trajectory.id,
          overallLikelihood: trajectory.likelihood,
          historicalScore: components.historicalScore,
          coherenceScore: components.coherenceScore,
          realismScore: components.realismScore,
          divergencePenalty: components.divergencePenalty,
          lastUpdated: new Date().toISOString(),
        };
      });
    },

    deletePersona: async (
      _parent: any,
      { personaId }: { personaId: string },
      context: Context,
    ) => {
      return context.personaEngine.deletePersona(personaId);
    },

    regeneratePersona: async (
      _parent: any,
      { personaId }: { personaId: string },
      context: Context,
    ) => {
      // Fetch existing persona
      const existingPersona = await context.personaEngine['fetchPersona'](
        personaId,
      );

      // Create new persona with same config
      const newPersona = await context.personaEngine.createPersona(
        existingPersona.sourceEntityId,
        {
          mutationRate: existingPersona.mutationRate,
          stabilityCoefficient: existingPersona.stabilityCoefficient,
        },
      );

      // Delete old persona
      await context.personaEngine.deletePersona(personaId);

      return newPersona;
    },
  },

  SyntheticPersona: {
    trajectories: async (parent: any, _args: any, context: Context) => {
      return context.personaEngine.getTrajectoriesForPersona(parent.id);
    },

    createdAt: (parent: any) => {
      return new Date(parent.metadata.createdAt).toISOString();
    },

    validUntil: (parent: any) => {
      return new Date(parent.metadata.validUntil).toISOString();
    },

    confidence: (parent: any) => {
      return parent.metadata.confidence;
    },

    generatorVersion: (parent: any) => {
      return parent.metadata.generatorVersion;
    },
  },

  FutureTrajectory: {
    simulatedAt: (parent: any) => {
      return new Date(parent.metadata.simulatedAt).toISOString();
    },
  },
};

/**
 * Calculates divergence metrics for trajectory comparison
 */
function calculateDivergenceMetrics(trajectories: FutureTrajectory[]) {
  if (trajectories.length < 2) {
    return {
      maxDivergence: 0,
      maxDivergenceTime: 0,
      avgDivergence: 0,
      primaryDivergenceDimension: 'none',
    };
  }

  let maxDivergence = 0;
  let maxDivergenceTime = 0;
  let totalDivergence = 0;
  let comparisonCount = 0;

  // Find max time horizon
  const maxTime = Math.max(...trajectories.map((t) => t.timeHorizon));

  // Compare all pairs at each time step
  for (let t = 0; t <= maxTime; t++) {
    const statesAtTime = trajectories
      .filter((traj) => t < traj.steps.length)
      .map((traj) => traj.steps[t].state);

    if (statesAtTime.length < 2) continue;

    for (let i = 0; i < statesAtTime.length; i++) {
      for (let j = i + 1; j < statesAtTime.length; j++) {
        const distance = calculateDistance(statesAtTime[i], statesAtTime[j]);
        totalDivergence += distance;
        comparisonCount++;

        if (distance > maxDivergence) {
          maxDivergence = distance;
          maxDivergenceTime = t;
        }
      }
    }
  }

  const avgDivergence = comparisonCount > 0 ? totalDivergence / comparisonCount : 0;

  // Find primary divergence dimension (simplified)
  const primaryDivergenceDimension = 'activityLevel'; // Would analyze in detail

  return {
    maxDivergence,
    maxDivergenceTime,
    avgDivergence,
    primaryDivergenceDimension,
  };
}
