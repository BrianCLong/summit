import type { Driver, Session } from 'neo4j-driver';
import type {
  PredictionBinding,
  BindPredictionInput,
} from '../models/PredictionBinding';
import { PredictionBindingModel } from '../models/PredictionBinding';
import type { Logger } from 'pino';

export interface Neo4jConfig {
  uri: string;
  user: string;
  password: string;
}

/**
 * PredictionBinder Algorithm
 *
 * Binds predictive model outputs to graph nodes/edges as first-class metadata.
 * Creates :PREDICTION_BINDING relationships in Neo4j with trigger rules.
 */
export class PredictionBinder {
  private bindingModel: PredictionBindingModel;
  private driver: Driver | null = null;

  constructor(
    private logger: Logger,
    private neo4jConfig?: Neo4jConfig,
  ) {
    this.bindingModel = new PredictionBindingModel();
  }

  /**
   * Initialize Neo4j driver
   */
  async initialize(driver: Driver): Promise<void> {
    this.driver = driver;
    await this.createIndexes();
  }

  /**
   * Create Neo4j indexes for fast binding retrieval
   */
  private async createIndexes(): Promise<void> {
    if (!this.driver) {
      this.logger.warn('Neo4j driver not initialized, skipping index creation');
      return;
    }

    const session: Session = this.driver.session();
    try {
      // Create constraint on Prediction ID
      await session.run(`
        CREATE CONSTRAINT prediction_id IF NOT EXISTS
        FOR (p:Prediction) REQUIRE p.id IS UNIQUE
      `);

      // Create indexes
      await session.run(`
        CREATE INDEX prediction_timestamp IF NOT EXISTS
        FOR (p:Prediction) ON (p.timestamp)
      `);

      await session.run(`
        CREATE INDEX prediction_type IF NOT EXISTS
        FOR (p:Prediction) ON (p.type)
      `);

      this.logger.info('Neo4j indexes created successfully');
    } catch (error) {
      this.logger.error({ error }, 'Failed to create Neo4j indexes');
    } finally {
      await session.close();
    }
  }

  /**
   * Bind a prediction to a graph node
   */
  async bindPrediction(input: BindPredictionInput): Promise<PredictionBinding> {
    this.logger.info({ input }, 'Binding prediction to node');

    // 1. Validate prediction schema
    this.validatePrediction(input);

    // 2. Create binding in model
    const binding = this.bindingModel.create(input);

    // 3. Persist to Neo4j (if driver available)
    if (this.driver) {
      await this.persistToNeo4j(binding);
    } else {
      this.logger.warn('Neo4j driver not available, binding stored in memory only');
    }

    // 4. Emit binding event (for trigger evaluator)
    this.emitBindingEvent(binding);

    this.logger.info({ bindingId: binding.id }, 'Prediction bound successfully');
    return binding;
  }

  /**
   * Validate prediction input
   */
  private validatePrediction(input: BindPredictionInput): void {
    if (input.prediction.confidence < 0 || input.prediction.confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }

    if (input.triggerRules.length === 0) {
      throw new Error('At least one trigger rule is required');
    }

    // Validate each trigger rule has required fields
    for (const rule of input.triggerRules) {
      if (!rule.workflowTemplate) {
        throw new Error('Workflow template is required for trigger rules');
      }
      if (!rule.policyCheck) {
        throw new Error('Policy check is required for trigger rules');
      }
    }
  }

  /**
   * Persist binding to Neo4j
   */
  private async persistToNeo4j(binding: PredictionBinding): Promise<void> {
    if (!this.driver) return;

    const session: Session = this.driver.session();
    try {
      const query = `
        MATCH (n {id: $nodeId})
        CREATE (p:Prediction {
          id: $predictionId,
          type: $predictionType,
          value: $predictionValue,
          confidence: $confidence,
          modelId: $modelId,
          modelVersion: $modelVersion,
          timestamp: datetime($timestamp),
          expiresAt: CASE WHEN $expiresAt IS NOT NULL THEN datetime($expiresAt) ELSE NULL END,
          metadata: $metadata
        })
        CREATE (n)-[:HAS_PREDICTION {
          bindingId: $bindingId,
          status: $status,
          triggerRules: $triggerRules,
          createdAt: datetime($createdAt)
        }]->(p)
        RETURN p, n
      `;

      await session.run(query, {
        nodeId: binding.nodeId,
        predictionId: binding.id,
        predictionType: binding.predictionType,
        predictionValue: JSON.stringify(binding.prediction.value),
        confidence: binding.prediction.confidence,
        modelId: binding.modelId,
        modelVersion: binding.modelVersion,
        timestamp: binding.prediction.timestamp.toISOString(),
        expiresAt: binding.prediction.expiresAt?.toISOString() || null,
        metadata: JSON.stringify(binding.prediction.metadata || {}),
        bindingId: binding.id,
        status: binding.status,
        triggerRules: JSON.stringify(binding.triggerRules),
        createdAt: binding.createdAt.toISOString(),
      });

      this.logger.debug({ bindingId: binding.id }, 'Binding persisted to Neo4j');
    } catch (error) {
      this.logger.error({ error, bindingId: binding.id }, 'Failed to persist binding to Neo4j');
      // Don't throw - binding is already in memory
    } finally {
      await session.close();
    }
  }

  /**
   * Emit binding event (for trigger evaluator to pick up)
   */
  private emitBindingEvent(binding: PredictionBinding): void {
    // In a real implementation, this would publish to Redis/Kafka
    // For now, we just log
    this.logger.debug(
      { bindingId: binding.id, nodeId: binding.nodeId },
      'Binding event emitted',
    );
  }

  /**
   * Get binding by ID
   */
  async getBinding(id: string): Promise<PredictionBinding | undefined> {
    return this.bindingModel.getById(id);
  }

  /**
   * Get bindings for a node
   */
  async getNodeBindings(nodeId: string): Promise<PredictionBinding[]> {
    return this.bindingModel.getByNodeId(nodeId);
  }

  /**
   * Get active bindings with filters
   */
  async getActiveBindings(filters?: {
    predictionType?: string;
    minConfidence?: number;
    limit?: number;
    offset?: number;
  }): Promise<PredictionBinding[]> {
    return this.bindingModel.getActiveBindings({
      predictionType: filters?.predictionType as any,
      minConfidence: filters?.minConfidence,
      limit: filters?.limit,
      offset: filters?.offset,
    });
  }

  /**
   * Expire a binding
   */
  async expireBinding(id: string): Promise<boolean> {
    const expired = this.bindingModel.expire(id);

    if (expired && this.driver) {
      // Update Neo4j
      const session: Session = this.driver.session();
      try {
        await session.run(
          `
          MATCH ()-[r:HAS_PREDICTION {bindingId: $bindingId}]->()
          SET r.status = 'EXPIRED', r.updatedAt = datetime()
        `,
          { bindingId: id },
        );
      } catch (error) {
        this.logger.error({ error, bindingId: id }, 'Failed to update binding in Neo4j');
      } finally {
        await session.close();
      }
    }

    return expired;
  }

  /**
   * Cleanup: close driver
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
    }
  }

  /**
   * Get model instance (for testing)
   */
  getModel(): PredictionBindingModel {
    return this.bindingModel;
  }
}
