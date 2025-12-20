import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import type {
  DigitalTwin,
  TwinMetadata,
  TwinStateVector,
  CreateTwinRequest,
  UpdateTwinStateRequest,
  TwinEvent,
  TwinState,
} from '../types/index.js';
import { DigitalTwinSchema } from '../types/index.js';
import { StateEstimator } from '../state/StateEstimator.js';
import { TwinRepository } from './TwinRepository.js';
import { EventBus } from './EventBus.js';

const logger = pino({ name: 'TwinService' });

export class TwinService {
  private repository: TwinRepository;
  private stateEstimator: StateEstimator;
  private eventBus: EventBus;

  constructor(
    repository: TwinRepository,
    stateEstimator: StateEstimator,
    eventBus: EventBus,
  ) {
    this.repository = repository;
    this.stateEstimator = stateEstimator;
    this.eventBus = eventBus;
  }

  async createTwin(request: CreateTwinRequest, userId: string): Promise<DigitalTwin> {
    const now = new Date();
    const id = uuidv4();

    const metadata: TwinMetadata = {
      id,
      name: request.name,
      type: request.type,
      description: request.description,
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      tags: request.tags ?? [],
    };

    const initialStateVector: TwinStateVector = {
      timestamp: now,
      confidence: 1.0,
      source: 'CREATION',
      properties: request.initialState ?? {},
    };

    const twin: DigitalTwin = DigitalTwinSchema.parse({
      metadata,
      state: 'INITIALIZING' as TwinState,
      currentStateVector: initialStateVector,
      stateHistory: [initialStateVector],
      dataBindings: (request.dataBindings ?? []).map((b) => ({
        ...b,
        id: uuidv4(),
      })),
      relationships: [],
      provenanceChain: [`created:${userId}:${now.toISOString()}`],
    });

    await this.repository.save(twin);
    await this.repository.createNeo4jNode(twin);

    await this.eventBus.publish({
      id: uuidv4(),
      twinId: id,
      type: 'STATE_CHANGE',
      timestamp: now,
      payload: { state: 'INITIALIZING', previousState: null },
      source: 'TwinService',
    });

    logger.info({ twinId: id, name: request.name }, 'Digital twin created');
    return twin;
  }

  async getTwin(twinId: string): Promise<DigitalTwin | null> {
    return this.repository.findById(twinId);
  }

  async listTwins(filters?: {
    type?: string;
    state?: TwinState;
    tags?: string[];
  }): Promise<DigitalTwin[]> {
    return this.repository.findAll(filters);
  }

  async updateState(request: UpdateTwinStateRequest): Promise<DigitalTwin> {
    const twin = await this.repository.findById(request.twinId);
    if (!twin) {
      throw new Error(`Twin not found: ${request.twinId}`);
    }

    const estimatedState = await this.stateEstimator.estimate(
      twin,
      request.properties,
      request.confidence ?? 0.9,
    );

    const newStateVector: TwinStateVector = {
      timestamp: new Date(),
      confidence: estimatedState.confidence,
      source: request.source,
      properties: estimatedState.properties,
      derived: estimatedState.derived,
    };

    twin.stateHistory.push(twin.currentStateVector);
    twin.currentStateVector = newStateVector;
    twin.metadata.updatedAt = new Date();
    twin.provenanceChain.push(
      `update:${request.source}:${newStateVector.timestamp.toISOString()}`,
    );

    if (twin.stateHistory.length > 1000) {
      twin.stateHistory = twin.stateHistory.slice(-1000);
    }

    await this.repository.save(twin);
    await this.repository.updateNeo4jNode(twin);

    await this.eventBus.publish({
      id: uuidv4(),
      twinId: request.twinId,
      type: 'DATA_SYNC',
      timestamp: newStateVector.timestamp,
      payload: { properties: request.properties, confidence: estimatedState.confidence },
      source: request.source,
    });

    return twin;
  }

  async setTwinState(twinId: string, state: TwinState): Promise<void> {
    const twin = await this.repository.findById(twinId);
    if (!twin) {
      throw new Error(`Twin not found: ${twinId}`);
    }

    const previousState = twin.state;
    twin.state = state;
    twin.metadata.updatedAt = new Date();

    await this.repository.save(twin);

    await this.eventBus.publish({
      id: uuidv4(),
      twinId,
      type: 'STATE_CHANGE',
      timestamp: new Date(),
      payload: { state, previousState },
      source: 'TwinService',
    });
  }

  async linkTwins(
    sourceTwinId: string,
    targetTwinId: string,
    relationshipType: string,
    properties?: Record<string, unknown>,
  ): Promise<void> {
    const [source, target] = await Promise.all([
      this.repository.findById(sourceTwinId),
      this.repository.findById(targetTwinId),
    ]);

    if (!source || !target) {
      throw new Error('One or both twins not found');
    }

    source.relationships.push({
      targetTwinId,
      type: relationshipType,
      properties,
    });

    await this.repository.save(source);
    await this.repository.createNeo4jRelationship(sourceTwinId, targetTwinId, relationshipType, properties);

    logger.info({ sourceTwinId, targetTwinId, relationshipType }, 'Twins linked');
  }

  async deleteTwin(twinId: string): Promise<void> {
    await this.repository.delete(twinId);
    await this.repository.deleteNeo4jNode(twinId);
    logger.info({ twinId }, 'Digital twin deleted');
  }
}
