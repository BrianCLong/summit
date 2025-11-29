import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { Driver, Session } from 'neo4j-driver';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { load } from 'js-yaml';
import { getPostgresPool, getNeo4jDriver } from '../../config/database.js';
import LLMService from '../../services/LLMService.js';
import EmbeddingService from '../../services/EmbeddingService.js';
import {
  ExtractionResult,
  IngestResult,
  SearchResult,
  FusionEntity,
  FusionRelationship
} from './types.js';
import logger from '../../utils/logger.js';

export class FusionService {
  private llmService: LLMService;
  private embeddingService: EmbeddingService;

  constructor() {
    this.llmService = new LLMService();
    this.embeddingService = new EmbeddingService();
  }

  private get db(): Pool {
    return getPostgresPool();
  }

  private get neo4j(): Driver {
    return getNeo4jDriver();
  }

  /**
   * Ingest content for Multimodal Fusion
   * 1. Save Source to Postgres
   * 2. Extract Entities via LLM
   * 3. Generate Embeddings (Text only currently)
   * 4. Save Entities to Neo4j
   * 5. Save Vectors to Postgres
   */
  async ingest(
    content: string,
    type: 'TEXT' | 'URL' | 'IMAGE' | 'SIGNAL' = 'TEXT',
    metadata: any = {}
  ): Promise<IngestResult> {
    const mediaSourceId = randomUUID();
    const investigationId = metadata.investigationId || randomUUID(); // Fallback if not provided

    // 1. Save Media Source
    await this.db.query(
      `INSERT INTO media_sources (id, uri, media_type, mime_type, processing_status, metadata, extraction_count)
       VALUES ($1, $2, $3, $4, $5, $6, 0)`,
      [
        mediaSourceId,
        type === 'URL' ? content : (type === 'TEXT' ? 'text-input' : 'raw-input'),
        type,
        type === 'TEXT' ? 'text/plain' : 'application/octet-stream',
        'PROCESSING',
        JSON.stringify(metadata)
      ]
    );

    try {
      // 2. Extract Entities
      // For IMAGE/SIGNAL, we need a description first.
      // TODO: Use VisionService or SignalAnalyzer to get description.
      // For now, we assume 'content' contains description or text for all types.
      const textToAnalyze = type === 'TEXT' ? content : (metadata.description || content);

      const extraction = await this.extractEntities(textToAnalyze, type);

      // 3. Generate Content Embedding (for the whole document)
      let contentEmbedding = null;
      if (type === 'TEXT' || (type === 'URL' && metadata.description)) {
         contentEmbedding = await this.embeddingService.generateEmbedding({ text: textToAnalyze });
      }

      // 4. Save to Postgres (Multimodal Entities)
      const entityPromises = extraction.entities.map(async (entity) => {
        const entityId = randomUUID();
        // Generate embedding for the entity itself
        const entityEmbedding = await this.embeddingService.generateEmbedding({ text: `${entity.label} ${entity.description || ''}` });

        // Save to Postgres
        await this.db.query(
          `INSERT INTO multimodal_entities (
            id, investigation_id, media_source_id, entity_type, extracted_text,
            confidence, text_embedding, metadata, extraction_method
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            entityId,
            investigationId,
            mediaSourceId,
            entity.type,
            entity.label,
            entity.confidence,
            JSON.stringify(entityEmbedding), // pgvector handles JSON array format
            JSON.stringify({ description: entity.description }),
            'LLM_EXTRACTION_V1'
          ]
        );

        return { ...entity, uuid: entityId };
      });

      const processedEntities = await Promise.all(entityPromises);

      // 5. Save to Neo4j
      const session = this.neo4j.session();
      try {
        await session.writeTransaction(async (tx) => {
          // Create MediaSource Node
          await tx.run(
            `MERGE (m:MediaSource {id: $id})
             SET m.uri = $uri, m.type = $type, m.metadata = $metadata`,
            { id: mediaSourceId, uri: type === 'URL' ? content : 'raw-input', type, metadata: JSON.stringify(metadata) }
          );

          // Create Entity Nodes and connect to MediaSource
          for (const entity of processedEntities) {
            await tx.run(
              `MERGE (e:Entity {name: $name, type: $type})
               ON CREATE SET e.id = $uuid, e.description = $desc
               MERGE (m:MediaSource {id: $sourceId})
               MERGE (m)-[:MENTIONS {confidence: $conf}]->(e)`,
              {
                name: entity.label,
                type: entity.type,
                uuid: entity.uuid,
                desc: entity.description || '',
                sourceId: mediaSourceId,
                conf: entity.confidence
              }
            );
          }

          // Create Relationships between Entities
          for (const rel of extraction.relationships) {
            const sourceEntity = processedEntities.find(e => e.label === rel.sourceId || e.id === rel.sourceId);
            const targetEntity = processedEntities.find(e => e.label === rel.targetId || e.id === rel.targetId);

            if (sourceEntity && targetEntity) {
               await tx.run(
                `MATCH (a:Entity {id: $idA}), (b:Entity {id: $idB})
                 MERGE (a)-[r:RELATED_TO {type: $relType}]->(b)
                 SET r.description = $desc, r.confidence = $conf`,
                {
                  idA: sourceEntity.uuid,
                  idB: targetEntity.uuid,
                  relType: rel.type,
                  desc: rel.description || '',
                  conf: rel.confidence
                }
               );
            }
          }
        });
      } finally {
        await session.close();
      }

      // Update Status
      await this.db.query(
        `UPDATE media_sources SET processing_status = 'COMPLETED', extraction_count = $1 WHERE id = $2`,
        [processedEntities.length, mediaSourceId]
      );

      return {
        mediaSourceId,
        entityCount: processedEntities.length,
        relationshipCount: extraction.relationships.length,
        vectorId: mediaSourceId
      };

    } catch (error) {
      logger.error('Ingestion failed', error);
      await this.db.query(
        `UPDATE media_sources SET processing_status = 'FAILED' WHERE id = $1`,
        [mediaSourceId]
      );
      throw error;
    }
  }

  /**
   * Search using Hybrid Fusion (Vector + Graph)
   * 1. Generate Query Embedding
   * 2. Search Postgres (Vector)
   * 3. Search Neo4j (Graph)
   * 4. Merge and Rank
   */
  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    const queryEmbedding = await this.embeddingService.generateEmbedding({ text: query });

    // 1. Vector Search (Postgres)
    const vectorRes = await this.db.query(
      `SELECT id, extracted_text, entity_type, confidence, 1 - (text_embedding <=> $1) as score, metadata
       FROM multimodal_entities
       ORDER BY text_embedding <=> $1 ASC
       LIMIT $2`,
      [JSON.stringify(queryEmbedding), limit]
    );

    const vectorHits: SearchResult[] = vectorRes.rows.map(row => ({
      id: row.id,
      score: row.score,
      source: 'vector',
      content: row.extracted_text,
      metadata: row.metadata,
      entity: {
        id: row.id,
        label: row.extracted_text,
        type: row.entity_type,
        confidence: row.confidence
      }
    }));

    // 2. Graph Search (Neo4j)
    const session = this.neo4j.session();
    let graphHits: SearchResult[] = [];

    try {
      const graphRes = await session.run(
        `CALL db.index.fulltext.queryNodes("entity_search", $query) YIELD node, score
         RETURN node.id as id, node.name as name, node.type as type, node.description as desc, score
         LIMIT $limit`,
         { query, limit }
      );

      graphHits = graphRes.records.map(rec => ({
        id: rec.get('id'),
        score: rec.get('score'),
        source: 'graph',
        content: rec.get('name'),
        metadata: { description: rec.get('desc') },
        entity: {
          id: rec.get('id'),
          label: rec.get('name'),
          type: rec.get('type'),
          confidence: 1.0
        }
      }));

    } catch (e) {
      logger.warn('Graph search failed (possibly missing index)', e);
    } finally {
      await session.close();
    }

    // 3. Fusion Ranking
    const fusionMap = new Map<string, SearchResult>();

    const addToMap = (hit: SearchResult, weight: number) => {
      const key = hit.content;
      const existing = fusionMap.get(key);
      if (existing) {
        existing.score += hit.score * weight;
        existing.source = 'hybrid';
      } else {
        fusionMap.set(key, { ...hit, score: hit.score * weight });
      }
    };

    vectorHits.forEach(h => addToMap(h, 1.0));
    graphHits.forEach(h => addToMap(h, 1.0));

    return Array.from(fusionMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async extractEntities(text: string, sourceType: string): Promise<ExtractionResult> {
    let template = '';
    try {
        template = await readFile(join(process.cwd(), 'prompts/extraction.fusion@v1.yaml'), 'utf-8');
    } catch (e) {
        logger.error('Failed to load prompt file', e);
        template = `Extract entities (Person, Org, Loc) from: {{text}}. Return JSON {entities:[], relationships:[]}`;
    }

    let promptTemplate = '';
    try {
      const doc = load(template) as any;
      promptTemplate = doc.template || template;
    } catch (e) {
      logger.warn('Failed to parse prompt YAML, falling back to raw text', e);
      promptTemplate = template;
    }

    const filledPrompt = promptTemplate
        .replace('{{text}}', text)
        .replace('{{source_type}}', sourceType);

    const resultStr = await this.llmService.complete({
        prompt: filledPrompt,
        model: 'gpt-4o',
        temperature: 0.0,
        responseFormat: 'json'
    });

    try {
        return JSON.parse(resultStr) as ExtractionResult;
    } catch (e) {
        logger.error('Failed to parse LLM JSON', e);
        return { entities: [], relationships: [] };
    }
  }
}
