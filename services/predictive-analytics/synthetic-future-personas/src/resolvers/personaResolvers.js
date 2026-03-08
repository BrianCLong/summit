"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.personaResolvers = void 0;
const BehavioralProfile_js_1 = require("../models/BehavioralProfile.js");
const LikelihoodScorer_js_1 = require("../algorithms/LikelihoodScorer.js");
exports.personaResolvers = {
    Query: {
        getPersona: async (_parent, { id }, context) => {
            const engine = context.personaEngine;
            const personas = await engine.getPersonasForEntity(id);
            if (personas.length === 0) {
                // Try fetching directly by persona ID
                try {
                    return await engine['fetchPersona'](id);
                }
                catch {
                    return null;
                }
            }
            return personas[0];
        },
        getPersonasForEntity: async (_parent, { entityId }, context) => {
            return context.personaEngine.getPersonasForEntity(entityId);
        },
        getTrajectory: async (_parent, { id }, context) => {
            try {
                return await context.personaEngine['fetchTrajectory'](id);
            }
            catch {
                return null;
            }
        },
        getTrajectoriesForPersona: async (_parent, { personaId }, context) => {
            return context.personaEngine.getTrajectoriesForPersona(personaId);
        },
        compareFutures: async (_parent, { personaId, scenarios }, context) => {
            const trajectories = await context.personaEngine.getTrajectoriesForPersona(personaId);
            const filteredTrajectories = trajectories.filter((t) => scenarios.includes(t.scenarioId));
            // Calculate divergence metrics
            const divergence = calculateDivergenceMetrics(filteredTrajectories);
            return {
                personaId,
                scenarios,
                trajectories: filteredTrajectories,
                divergence,
            };
        },
        getLikelihoods: async (_parent, { personaId }, context) => {
            const trajectories = await context.personaEngine.getTrajectoriesForPersona(personaId);
            const persona = await context.personaEngine['fetchPersona'](personaId);
            return trajectories.map((trajectory) => {
                const components = (0, LikelihoodScorer_js_1.calculateLikelihoodComponents)(trajectory, persona, []);
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
        searchTrajectories: async (_parent, { minLikelihood, maxTimeHorizon, pressureTypes, }, context) => {
            // This would need a more sophisticated Neo4j query in production
            // For now, we'll return an empty array as a placeholder
            return [];
        },
    },
    Mutation: {
        createPersona: async (_parent, { input }, context) => {
            const config = {
                mutationRate: input.mutationRate,
                branchingFactor: input.branchingFactor,
                validityWindow: input.validityWindow
                    ? input.validityWindow * 30 * 24 * 60 * 60 * 1000
                    : undefined,
            };
            return context.personaEngine.createPersona(input.sourceEntityId, config);
        },
        simulateFuture: async (_parent, { personaId, scenario }, context) => {
            const scenarioObj = {
                id: scenario.id,
                name: scenario.name,
                timeHorizon: scenario.timeHorizon,
                pressures: scenario.pressures.map((p) => ({
                    type: p.type,
                    strength: p.strength,
                    duration: p.duration,
                    decay: p.decay || 0.1,
                    source: p.source,
                    onset: p.onset,
                })),
            };
            return context.personaEngine.simulateFuture(personaId, scenarioObj);
        },
        applyPressure: async (_parent, { trajectoryId, pressure }, context) => {
            const pressureVector = {
                type: pressure.type,
                strength: pressure.strength,
                duration: pressure.duration,
                decay: pressure.decay || 0.1,
                source: pressure.source,
                onset: pressure.onset,
            };
            return context.personaEngine.applyPressure(trajectoryId, pressureVector);
        },
        updateLikelihoods: async (_parent, { personaId, evidence }, context) => {
            const observedState = evidence.observedBehavior;
            const trajectories = await context.personaEngine.updateLikelihoods(personaId, observedState, evidence.observationTime, evidence.confidence);
            const persona = await context.personaEngine['fetchPersona'](personaId);
            return trajectories.map((trajectory) => {
                const components = (0, LikelihoodScorer_js_1.calculateLikelihoodComponents)(trajectory, persona, []);
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
        deletePersona: async (_parent, { personaId }, context) => {
            return context.personaEngine.deletePersona(personaId);
        },
        regeneratePersona: async (_parent, { personaId }, context) => {
            // Fetch existing persona
            const existingPersona = await context.personaEngine['fetchPersona'](personaId);
            // Create new persona with same config
            const newPersona = await context.personaEngine.createPersona(existingPersona.sourceEntityId, {
                mutationRate: existingPersona.mutationRate,
                stabilityCoefficient: existingPersona.stabilityCoefficient,
            });
            // Delete old persona
            await context.personaEngine.deletePersona(personaId);
            return newPersona;
        },
    },
    SyntheticPersona: {
        trajectories: async (parent, _args, context) => {
            return context.personaEngine.getTrajectoriesForPersona(parent.id);
        },
        createdAt: (parent) => {
            return new Date(parent.metadata.createdAt).toISOString();
        },
        validUntil: (parent) => {
            return new Date(parent.metadata.validUntil).toISOString();
        },
        confidence: (parent) => {
            return parent.metadata.confidence;
        },
        generatorVersion: (parent) => {
            return parent.metadata.generatorVersion;
        },
    },
    FutureTrajectory: {
        simulatedAt: (parent) => {
            return new Date(parent.metadata.simulatedAt).toISOString();
        },
    },
};
/**
 * Calculates divergence metrics for trajectory comparison
 */
function calculateDivergenceMetrics(trajectories) {
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
        if (statesAtTime.length < 2)
            continue;
        for (let i = 0; i < statesAtTime.length; i++) {
            for (let j = i + 1; j < statesAtTime.length; j++) {
                const distance = (0, BehavioralProfile_js_1.calculateDistance)(statesAtTime[i], statesAtTime[j]);
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
