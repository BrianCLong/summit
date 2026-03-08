"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersonaEngine = void 0;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const winston_1 = __importDefault(require("winston"));
const PersonaGenerator_js_1 = require("./algorithms/PersonaGenerator.js");
const LikelihoodScorer_js_1 = require("./algorithms/LikelihoodScorer.js");
const TrajectorySimulator_js_1 = require("./algorithms/TrajectorySimulator.js");
class PersonaEngine {
    driver;
    logger;
    historicalPatterns = [];
    constructor(config) {
        this.driver = neo4j_driver_1.default.driver(config.neo4jUri, neo4j_driver_1.default.auth.basic(config.neo4jUser, config.neo4jPassword));
        this.logger = winston_1.default.createLogger({
            level: config.logLevel || 'info',
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
            transports: [new winston_1.default.transports.Console()],
        });
        this.logger.info('PersonaEngine initialized');
    }
    /**
     * Creates a new synthetic persona from an entity
     */
    async createPersona(entityId, config) {
        this.logger.info(`Creating persona for entity ${entityId}`);
        // Fetch entity data from Neo4j
        const entity = await this.fetchEntity(entityId);
        // Generate persona
        const persona = (0, PersonaGenerator_js_1.generateSyntheticPersona)(entity, config);
        // Persist to Neo4j
        await this.persistPersona(persona);
        this.logger.info(`Created persona ${persona.id}`);
        return persona;
    }
    /**
     * Simulates a future trajectory for a persona
     */
    async simulateFuture(personaId, scenario) {
        this.logger.info(`Simulating future for persona ${personaId}, scenario ${scenario.id}`);
        // Fetch persona
        const persona = await this.fetchPersona(personaId);
        // Simulate trajectory
        const trajectory = (0, TrajectorySimulator_js_1.simulateTrajectory)(persona, scenario);
        // Score likelihood
        trajectory.likelihood = (0, LikelihoodScorer_js_1.scoreTrajectoryLikelihood)(trajectory, persona, this.historicalPatterns);
        // Persist to Neo4j
        await this.persistTrajectory(trajectory);
        this.logger.info(`Created trajectory ${trajectory.id} with likelihood ${trajectory.likelihood.toFixed(3)}`);
        return trajectory;
    }
    /**
     * Simulates multiple scenarios for a persona
     */
    async simulateMultipleScenarios(personaId, scenarios) {
        this.logger.info(`Simulating ${scenarios.length} scenarios for persona ${personaId}`);
        const persona = await this.fetchPersona(personaId);
        const trajectories = (0, TrajectorySimulator_js_1.simulateMultipleTrajectories)(persona, scenarios);
        // Score all trajectories
        for (const trajectory of trajectories) {
            trajectory.likelihood = (0, LikelihoodScorer_js_1.scoreTrajectoryLikelihood)(trajectory, persona, this.historicalPatterns);
        }
        // Normalize likelihoods
        const normalizedTrajectories = (0, LikelihoodScorer_js_1.normalizeLikelihoods)(trajectories);
        // Persist all trajectories
        for (const trajectory of normalizedTrajectories) {
            await this.persistTrajectory(trajectory);
        }
        return normalizedTrajectories;
    }
    /**
     * Applies additional pressure to an existing trajectory
     */
    async applyPressure(trajectoryId, pressure) {
        this.logger.info(`Applying pressure to trajectory ${trajectoryId}`);
        // Fetch existing trajectory
        const trajectory = await this.fetchTrajectory(trajectoryId);
        const persona = await this.fetchPersona(trajectory.personaId);
        // Create new scenario with additional pressure
        const newScenario = {
            id: `${trajectory.scenarioId}_plus_${pressure.type}`,
            name: `Modified ${trajectory.scenarioId}`,
            timeHorizon: trajectory.timeHorizon,
            pressures: [...trajectory.steps[0].pressuresApplied, pressure],
        };
        // Re-simulate with new pressure
        const newTrajectory = (0, TrajectorySimulator_js_1.simulateTrajectory)(persona, newScenario);
        newTrajectory.likelihood = (0, LikelihoodScorer_js_1.scoreTrajectoryLikelihood)(newTrajectory, persona, this.historicalPatterns);
        await this.persistTrajectory(newTrajectory);
        return newTrajectory;
    }
    /**
     * Updates trajectory likelihoods based on observed evidence
     */
    async updateLikelihoods(personaId, observedState, observationTime, confidence) {
        this.logger.info(`Updating likelihoods for persona ${personaId}`);
        // Fetch all trajectories for this persona
        const trajectories = await this.fetchTrajectoriesForPersona(personaId);
        // Update likelihoods
        const updatedTrajectories = (0, LikelihoodScorer_js_1.updateLikelihoodsWithEvidence)(trajectories, observedState, observationTime, confidence);
        // Persist updates
        for (const trajectory of updatedTrajectories) {
            await this.updateTrajectoryLikelihood(trajectory.id, trajectory.likelihood);
        }
        return updatedTrajectories;
    }
    /**
     * Gets all personas for an entity
     */
    async getPersonasForEntity(entityId) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (e:Entity {id: $entityId})-[:HAS_SYNTHETIC_PERSONA]->(p:SyntheticPersona)
        RETURN p
        ORDER BY p.createdAt DESC
        `, { entityId });
            return result.records.map((record) => this.deserializePersona(record.get('p').properties));
        }
        finally {
            await session.close();
        }
    }
    /**
     * Gets all trajectories for a persona
     */
    async getTrajectoriesForPersona(personaId) {
        return this.fetchTrajectoriesForPersona(personaId);
    }
    /**
     * Deletes a persona and all its trajectories
     */
    async deletePersona(personaId) {
        const session = this.driver.session();
        try {
            await session.run(`
        MATCH (p:SyntheticPersona {id: $personaId})
        OPTIONAL MATCH (p)-[:EVOLVES_TO]->(fs:FutureState)
        DETACH DELETE p, fs
        `, { personaId });
            this.logger.info(`Deleted persona ${personaId}`);
            return true;
        }
        catch (error) {
            this.logger.error(`Error deleting persona: ${error}`);
            return false;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Loads historical patterns for likelihood scoring
     */
    async loadHistoricalPatterns(patterns) {
        this.historicalPatterns = patterns;
        this.logger.info(`Loaded ${patterns.length} historical patterns`);
    }
    /**
     * Closes database connections
     */
    async close() {
        await this.driver.close();
        this.logger.info('PersonaEngine closed');
    }
    // Private methods
    async fetchEntity(entityId) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (e:Entity {id: $entityId})
        RETURN e
        `, { entityId });
            if (result.records.length === 0) {
                throw new Error(`Entity ${entityId} not found`);
            }
            const entityNode = result.records[0].get('e');
            return {
                id: entityId,
                type: entityNode.properties.type,
                properties: entityNode.properties,
                activityHistory: [], // Would fetch from database in real implementation
            };
        }
        finally {
            await session.close();
        }
    }
    async fetchPersona(personaId) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (p:SyntheticPersona {id: $personaId})
        RETURN p
        `, { personaId });
            if (result.records.length === 0) {
                throw new Error(`Persona ${personaId} not found`);
            }
            return this.deserializePersona(result.records[0].get('p').properties);
        }
        finally {
            await session.close();
        }
    }
    async fetchTrajectory(trajectoryId) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (t:FutureTrajectory {id: $trajectoryId})
        RETURN t
        `, { trajectoryId });
            if (result.records.length === 0) {
                throw new Error(`Trajectory ${trajectoryId} not found`);
            }
            return JSON.parse(result.records[0].get('t').properties.data);
        }
        finally {
            await session.close();
        }
    }
    async fetchTrajectoriesForPersona(personaId) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (p:SyntheticPersona {id: $personaId})-[:HAS_TRAJECTORY]->(t:FutureTrajectory)
        RETURN t
        ORDER BY t.simulatedAt DESC
        `, { personaId });
            return result.records.map((record) => JSON.parse(record.get('t').properties.data));
        }
        finally {
            await session.close();
        }
    }
    async persistPersona(persona) {
        const session = this.driver.session();
        try {
            await session.run(`
        MATCH (e:Entity {id: $sourceEntityId})
        CREATE (p:SyntheticPersona {
          id: $id,
          sourceEntityId: $sourceEntityId,
          mutationRate: $mutationRate,
          stabilityCoefficient: $stabilityCoefficient,
          createdAt: datetime($createdAt),
          validUntil: datetime($validUntil),
          confidence: $confidence,
          data: $data
        })
        CREATE (e)-[:HAS_SYNTHETIC_PERSONA]->(p)
        `, {
                id: persona.id,
                sourceEntityId: persona.sourceEntityId,
                mutationRate: persona.mutationRate,
                stabilityCoefficient: persona.stabilityCoefficient,
                createdAt: new Date(persona.metadata.createdAt).toISOString(),
                validUntil: new Date(persona.metadata.validUntil).toISOString(),
                confidence: persona.metadata.confidence,
                data: JSON.stringify(persona),
            });
        }
        finally {
            await session.close();
        }
    }
    async persistTrajectory(trajectory) {
        const session = this.driver.session();
        try {
            await session.run(`
        MATCH (p:SyntheticPersona {id: $personaId})
        CREATE (t:FutureTrajectory {
          id: $id,
          personaId: $personaId,
          scenarioId: $scenarioId,
          timeHorizon: $timeHorizon,
          likelihood: $likelihood,
          simulatedAt: datetime($simulatedAt),
          data: $data
        })
        CREATE (p)-[:HAS_TRAJECTORY]->(t)
        `, {
                id: trajectory.id,
                personaId: trajectory.personaId,
                scenarioId: trajectory.scenarioId,
                timeHorizon: trajectory.timeHorizon,
                likelihood: trajectory.likelihood,
                simulatedAt: new Date(trajectory.metadata.simulatedAt).toISOString(),
                data: JSON.stringify(trajectory),
            });
        }
        finally {
            await session.close();
        }
    }
    async updateTrajectoryLikelihood(trajectoryId, likelihood) {
        const session = this.driver.session();
        try {
            await session.run(`
        MATCH (t:FutureTrajectory {id: $trajectoryId})
        SET t.likelihood = $likelihood
        `, { trajectoryId, likelihood });
        }
        finally {
            await session.close();
        }
    }
    deserializePersona(properties) {
        return JSON.parse(properties.data);
    }
}
exports.PersonaEngine = PersonaEngine;
