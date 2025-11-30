import neo4j, { Driver, Session } from 'neo4j-driver';
import winston from 'winston';
import {
  Entity,
  generateSyntheticPersona,
} from './algorithms/PersonaGenerator.js';
import {
  scoreTrajectoryLikelihood,
  updateLikelihoodsWithEvidence,
  HistoricalPattern,
  normalizeLikelihoods,
} from './algorithms/LikelihoodScorer.js';
import {
  simulateTrajectory,
  simulateMultipleTrajectories,
} from './algorithms/TrajectorySimulator.js';
import { BehavioralProfile } from './models/BehavioralProfile.js';
import { PressureVector, PRESSURE_SCENARIOS } from './models/EnvironmentalPressure.js';
import { FutureTrajectory, Scenario } from './models/FutureTrajectory.js';
import {
  PersonaConfig,
  SyntheticPersona,
} from './models/SyntheticPersona.js';

export interface PersonaEngineConfig {
  neo4jUri: string;
  neo4jUser: string;
  neo4jPassword: string;
  logLevel?: string;
}

export class PersonaEngine {
  private driver: Driver;
  private logger: winston.Logger;
  private historicalPatterns: HistoricalPattern[] = [];

  constructor(config: PersonaEngineConfig) {
    this.driver = neo4j.driver(
      config.neo4jUri,
      neo4j.auth.basic(config.neo4jUser, config.neo4jPassword),
    );

    this.logger = winston.createLogger({
      level: config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      transports: [new winston.transports.Console()],
    });

    this.logger.info('PersonaEngine initialized');
  }

  /**
   * Creates a new synthetic persona from an entity
   */
  async createPersona(
    entityId: string,
    config?: PersonaConfig,
  ): Promise<SyntheticPersona> {
    this.logger.info(`Creating persona for entity ${entityId}`);

    // Fetch entity data from Neo4j
    const entity = await this.fetchEntity(entityId);

    // Generate persona
    const persona = generateSyntheticPersona(entity, config);

    // Persist to Neo4j
    await this.persistPersona(persona);

    this.logger.info(`Created persona ${persona.id}`);

    return persona;
  }

  /**
   * Simulates a future trajectory for a persona
   */
  async simulateFuture(
    personaId: string,
    scenario: Scenario,
  ): Promise<FutureTrajectory> {
    this.logger.info(
      `Simulating future for persona ${personaId}, scenario ${scenario.id}`,
    );

    // Fetch persona
    const persona = await this.fetchPersona(personaId);

    // Simulate trajectory
    const trajectory = simulateTrajectory(persona, scenario);

    // Score likelihood
    trajectory.likelihood = scoreTrajectoryLikelihood(
      trajectory,
      persona,
      this.historicalPatterns,
    );

    // Persist to Neo4j
    await this.persistTrajectory(trajectory);

    this.logger.info(
      `Created trajectory ${trajectory.id} with likelihood ${trajectory.likelihood.toFixed(3)}`,
    );

    return trajectory;
  }

  /**
   * Simulates multiple scenarios for a persona
   */
  async simulateMultipleScenarios(
    personaId: string,
    scenarios: Scenario[],
  ): Promise<FutureTrajectory[]> {
    this.logger.info(
      `Simulating ${scenarios.length} scenarios for persona ${personaId}`,
    );

    const persona = await this.fetchPersona(personaId);

    const trajectories = simulateMultipleTrajectories(persona, scenarios);

    // Score all trajectories
    for (const trajectory of trajectories) {
      trajectory.likelihood = scoreTrajectoryLikelihood(
        trajectory,
        persona,
        this.historicalPatterns,
      );
    }

    // Normalize likelihoods
    const normalizedTrajectories = normalizeLikelihoods(trajectories);

    // Persist all trajectories
    for (const trajectory of normalizedTrajectories) {
      await this.persistTrajectory(trajectory);
    }

    return normalizedTrajectories;
  }

  /**
   * Applies additional pressure to an existing trajectory
   */
  async applyPressure(
    trajectoryId: string,
    pressure: PressureVector,
  ): Promise<FutureTrajectory> {
    this.logger.info(`Applying pressure to trajectory ${trajectoryId}`);

    // Fetch existing trajectory
    const trajectory = await this.fetchTrajectory(trajectoryId);
    const persona = await this.fetchPersona(trajectory.personaId);

    // Create new scenario with additional pressure
    const newScenario: Scenario = {
      id: `${trajectory.scenarioId}_plus_${pressure.type}`,
      name: `Modified ${trajectory.scenarioId}`,
      timeHorizon: trajectory.timeHorizon,
      pressures: [...trajectory.steps[0].pressuresApplied, pressure],
    };

    // Re-simulate with new pressure
    const newTrajectory = simulateTrajectory(persona, newScenario);

    newTrajectory.likelihood = scoreTrajectoryLikelihood(
      newTrajectory,
      persona,
      this.historicalPatterns,
    );

    await this.persistTrajectory(newTrajectory);

    return newTrajectory;
  }

  /**
   * Updates trajectory likelihoods based on observed evidence
   */
  async updateLikelihoods(
    personaId: string,
    observedState: BehavioralProfile,
    observationTime: number,
    confidence: number,
  ): Promise<FutureTrajectory[]> {
    this.logger.info(`Updating likelihoods for persona ${personaId}`);

    // Fetch all trajectories for this persona
    const trajectories = await this.fetchTrajectoriesForPersona(personaId);

    // Update likelihoods
    const updatedTrajectories = updateLikelihoodsWithEvidence(
      trajectories,
      observedState,
      observationTime,
      confidence,
    );

    // Persist updates
    for (const trajectory of updatedTrajectories) {
      await this.updateTrajectoryLikelihood(trajectory.id, trajectory.likelihood);
    }

    return updatedTrajectories;
  }

  /**
   * Gets all personas for an entity
   */
  async getPersonasForEntity(entityId: string): Promise<SyntheticPersona[]> {
    const session = this.driver.session();

    try {
      const result = await session.run(
        `
        MATCH (e:Entity {id: $entityId})-[:HAS_SYNTHETIC_PERSONA]->(p:SyntheticPersona)
        RETURN p
        ORDER BY p.createdAt DESC
        `,
        { entityId },
      );

      return result.records.map((record) =>
        this.deserializePersona(record.get('p').properties),
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Gets all trajectories for a persona
   */
  async getTrajectoriesForPersona(
    personaId: string,
  ): Promise<FutureTrajectory[]> {
    return this.fetchTrajectoriesForPersona(personaId);
  }

  /**
   * Deletes a persona and all its trajectories
   */
  async deletePersona(personaId: string): Promise<boolean> {
    const session = this.driver.session();

    try {
      await session.run(
        `
        MATCH (p:SyntheticPersona {id: $personaId})
        OPTIONAL MATCH (p)-[:EVOLVES_TO]->(fs:FutureState)
        DETACH DELETE p, fs
        `,
        { personaId },
      );

      this.logger.info(`Deleted persona ${personaId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting persona: ${error}`);
      return false;
    } finally {
      await session.close();
    }
  }

  /**
   * Loads historical patterns for likelihood scoring
   */
  async loadHistoricalPatterns(patterns: HistoricalPattern[]): Promise<void> {
    this.historicalPatterns = patterns;
    this.logger.info(`Loaded ${patterns.length} historical patterns`);
  }

  /**
   * Closes database connections
   */
  async close(): Promise<void> {
    await this.driver.close();
    this.logger.info('PersonaEngine closed');
  }

  // Private methods

  private async fetchEntity(entityId: string): Promise<Entity> {
    const session = this.driver.session();

    try {
      const result = await session.run(
        `
        MATCH (e:Entity {id: $entityId})
        RETURN e
        `,
        { entityId },
      );

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
    } finally {
      await session.close();
    }
  }

  private async fetchPersona(personaId: string): Promise<SyntheticPersona> {
    const session = this.driver.session();

    try {
      const result = await session.run(
        `
        MATCH (p:SyntheticPersona {id: $personaId})
        RETURN p
        `,
        { personaId },
      );

      if (result.records.length === 0) {
        throw new Error(`Persona ${personaId} not found`);
      }

      return this.deserializePersona(result.records[0].get('p').properties);
    } finally {
      await session.close();
    }
  }

  private async fetchTrajectory(
    trajectoryId: string,
  ): Promise<FutureTrajectory> {
    const session = this.driver.session();

    try {
      const result = await session.run(
        `
        MATCH (t:FutureTrajectory {id: $trajectoryId})
        RETURN t
        `,
        { trajectoryId },
      );

      if (result.records.length === 0) {
        throw new Error(`Trajectory ${trajectoryId} not found`);
      }

      return JSON.parse(result.records[0].get('t').properties.data);
    } finally {
      await session.close();
    }
  }

  private async fetchTrajectoriesForPersona(
    personaId: string,
  ): Promise<FutureTrajectory[]> {
    const session = this.driver.session();

    try {
      const result = await session.run(
        `
        MATCH (p:SyntheticPersona {id: $personaId})-[:HAS_TRAJECTORY]->(t:FutureTrajectory)
        RETURN t
        ORDER BY t.simulatedAt DESC
        `,
        { personaId },
      );

      return result.records.map((record) =>
        JSON.parse(record.get('t').properties.data),
      );
    } finally {
      await session.close();
    }
  }

  private async persistPersona(persona: SyntheticPersona): Promise<void> {
    const session = this.driver.session();

    try {
      await session.run(
        `
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
        `,
        {
          id: persona.id,
          sourceEntityId: persona.sourceEntityId,
          mutationRate: persona.mutationRate,
          stabilityCoefficient: persona.stabilityCoefficient,
          createdAt: new Date(persona.metadata.createdAt).toISOString(),
          validUntil: new Date(persona.metadata.validUntil).toISOString(),
          confidence: persona.metadata.confidence,
          data: JSON.stringify(persona),
        },
      );
    } finally {
      await session.close();
    }
  }

  private async persistTrajectory(trajectory: FutureTrajectory): Promise<void> {
    const session = this.driver.session();

    try {
      await session.run(
        `
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
        `,
        {
          id: trajectory.id,
          personaId: trajectory.personaId,
          scenarioId: trajectory.scenarioId,
          timeHorizon: trajectory.timeHorizon,
          likelihood: trajectory.likelihood,
          simulatedAt: new Date(trajectory.metadata.simulatedAt).toISOString(),
          data: JSON.stringify(trajectory),
        },
      );
    } finally {
      await session.close();
    }
  }

  private async updateTrajectoryLikelihood(
    trajectoryId: string,
    likelihood: number,
  ): Promise<void> {
    const session = this.driver.session();

    try {
      await session.run(
        `
        MATCH (t:FutureTrajectory {id: $trajectoryId})
        SET t.likelihood = $likelihood
        `,
        { trajectoryId, likelihood },
      );
    } finally {
      await session.close();
    }
  }

  private deserializePersona(properties: any): SyntheticPersona {
    return JSON.parse(properties.data);
  }
}
