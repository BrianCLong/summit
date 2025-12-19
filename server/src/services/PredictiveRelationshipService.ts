import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const RelationshipService = require('./RelationshipService.js');
import EmbeddingService from './EmbeddingService.js';
import { getNeo4jDriver } from '../config/database.js';
import logger from '../utils/logger.js';
import { Driver, Session } from 'neo4j-driver';

export interface PredictionOptions {
  threshold?: number;
  limit?: number;
  investigationId?: string;
  candidateTypes?: string[];
  generateMissingEmbeddings?: boolean;
}

export interface PredictedRelationship {
  sourceId: string;
  targetId: string;
  sourceLabel: string;
  targetLabel: string;
  suggestedType: string;
  confidence: number;
  similarity: number;
  reasoning: string[];
}

export class PredictiveRelationshipService {
  private embeddingService: EmbeddingService;
  private relationshipService: any;
  private driver: Driver | null = null;

  constructor(embeddingService?: EmbeddingService, relationshipService?: any, driver?: Driver) {
    this.embeddingService = embeddingService || new EmbeddingService();
    this.relationshipService = relationshipService || new RelationshipService();
    this.driver = driver || null;
  }

  private getDriver(): Driver {
    if (!this.driver) {
      this.driver = getNeo4jDriver();
      // Ensure relationship service has the driver
      if (this.relationshipService.setDriver) {
        this.relationshipService.setDriver(this.driver);
      }
    }
    return this.driver;
  }

  /**
   * Predict relationships for a specific entity
   */
  async predictRelationships(
    entityId: string,
    options: PredictionOptions = {}
  ): Promise<PredictedRelationship[]> {
    const session = this.getDriver().session();
    const {
      threshold = 0.7,
      limit = 10,
      generateMissingEmbeddings = true
    } = options;

    try {
      // 1. Fetch Source Entity
      const sourceResult = await session.run(
        `MATCH (e:Entity {id: $id}) RETURN e`,
        { id: entityId }
      );

      if (sourceResult.records.length === 0) {
        throw new Error(`Entity ${entityId} not found`);
      }

      const sourceNode = sourceResult.records[0].get('e');
      const sourceProps = sourceNode.properties;
      const investigationId = options.investigationId || sourceProps.investigationId;

      // 2. Ensure Source Embedding
      let sourceEmbedding = sourceProps.embedding;
      if (!sourceEmbedding || sourceEmbedding.length === 0) {
        if (generateMissingEmbeddings) {
          logger.info(`Generating missing embedding for source entity ${entityId}`);
          sourceEmbedding = await this.generateAndStoreEmbedding(entityId, sourceProps);
        } else {
          return [];
        }
      }

      // 3. Find Candidates
      // Fetch entities in same investigation (if applicable), excluding self and already connected
      // Also return their embeddings if they exist
      const candidatesQuery = `
        MATCH (target:Entity)
        WHERE target.id <> $id
          ${investigationId ? 'AND target.investigationId = $investigationId' : ''}
          AND NOT (target)-[]-(:Entity {id: $id})
          ${options.candidateTypes && options.candidateTypes.length > 0 ? 'AND target.type IN $types' : ''}
        RETURN target, target.embedding as embedding
        LIMIT 100
      `;

      const candidatesResult = await session.run(candidatesQuery, {
        id: entityId,
        investigationId: investigationId || null,
        types: options.candidateTypes || []
      });

      const predictions: PredictedRelationship[] = [];

      for (const record of candidatesResult.records) {
        const targetNode = record.get('target');
        const targetProps = targetNode.properties;
        let targetEmbedding = record.get('embedding');

        // Generate target embedding if missing (and allowed)
        if (!targetEmbedding && generateMissingEmbeddings) {
           try {
             targetEmbedding = await this.generateAndStoreEmbedding(targetProps.id, targetProps);
           } catch (e) {
             logger.warn(`Failed to generate embedding for candidate ${targetProps.id}`, e);
             continue;
           }
        }

        if (!targetEmbedding) continue;

        // 4. Calculate Similarity
        const similarity = this.embeddingService.cosineSimilarity(sourceEmbedding, targetEmbedding);

        if (similarity < threshold) continue;

        // 5. Heuristics & Type Suggestion
        const suggestions = this.relationshipService.suggestRelationshipTypes(sourceProps.type, targetProps.type);

        if (suggestions.length === 0) continue;

        // Pick the best suggestion (first one is highest weight)
        const bestSuggestion = suggestions[0];

        // Refine score based on heuristics
        const reasoning = [`High semantic similarity (${(similarity * 100).toFixed(1)}%)`];

        if (similarity > 0.9) reasoning.push("Very strong textual match");
        else if (similarity > 0.8) reasoning.push("Strong textual match");

        reasoning.push(`Recommended type: ${bestSuggestion.type} (Match confidence: ${bestSuggestion.weight})`);

        // Combined Confidence
        const confidence = (similarity * 0.7) + (bestSuggestion.weight * 0.3);

        predictions.push({
          sourceId: entityId,
          targetId: targetProps.id,
          sourceLabel: sourceProps.label,
          targetLabel: targetProps.label,
          suggestedType: bestSuggestion.type,
          confidence,
          similarity,
          reasoning
        });
      }

      return predictions.sort((a, b) => b.confidence - a.confidence).slice(0, limit);

    } catch (error) {
      logger.error('Error predicting relationships:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Generates embedding for an entity and updates it in Neo4j
   */
  async generateAndStoreEmbedding(entityId: string, entityProps: any): Promise<number[]> {
    const textParts = [];
    if (entityProps.text) textParts.push(entityProps.text);
    if (entityProps.description) textParts.push(entityProps.description);
    if (entityProps.label) textParts.push(entityProps.label);
    if (entityProps.value) textParts.push(entityProps.value);
    if (entityProps.type) textParts.push(`Type: ${entityProps.type}`);

    const text = textParts.join(' \n');

    if (!text || text.length < 3) {
      logger.debug(`Text too short to embed for entity ${entityId}`);
      return [];
    }

    try {
      const embedding = await this.embeddingService.generateEmbedding({ text });

      // Store in Neo4j
      const session = this.getDriver().session();
      try {
        await session.run(
          `MATCH (e:Entity {id: $id}) SET e.embedding = $embedding`,
          { id: entityId, embedding }
        );
      } finally {
        await session.close();
      }

      return embedding;
    } catch (error) {
      logger.error(`Failed to generate/store embedding for ${entityId}`, error);
      throw error;
    }
  }
}

export default new PredictiveRelationshipService();
