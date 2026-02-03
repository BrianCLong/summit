// @ts-nocheck
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
import VisionService from '../../services/VisionService.js';
import { SignalClassificationService } from '../../sigint/SignalClassificationService.js';

export class FusionService {
  private llmService: LLMService;
  private embeddingService: EmbeddingService;
  private visionService: VisionService;
  private signalService: SignalClassificationService;

  constructor() {
    this.llmService = new LLMService();
    this.embeddingService = new EmbeddingService();
    this.visionService = new VisionService();
    this.signalService = SignalClassificationService.getInstance();
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
    tenantId: string,
    content: string,
    type: 'TEXT' | 'URL' | 'IMAGE' | 'SIGNAL' = 'TEXT',
    metadata: any = {}
  ): Promise<IngestResult> {
    const mediaSourceId = randomUUID();
    const investigationId = metadata.investigationId || randomUUID();

    // 1. Save Media Source
    await this.db.query(
      `INSERT INTO media_sources (id, tenant_id, uri, media_type, mime_type, processing_status, metadata, extraction_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0)`,
      [
        mediaSourceId,
        tenantId,
        type === 'URL' ? content : (type === 'TEXT' ? 'text-input' : 'raw-input'),
        type,
        type === 'TEXT' ? 'text/plain' : 'application/octet-stream',
        'PROCESSING',
        JSON.stringify(metadata)
      ]
    );

    try {
      // 2. Extract Entities
      let analysisText = content;

      if (type === 'IMAGE') {
        analysisText = await this.visionService.analyzeImage(content, metadata.prompt);
      } else if (type === 'SIGNAL') {
        let signalData = metadata.signal;
        if (!signalData && content.startsWith('{')) {
          try { signalData = JSON.parse(content); } catch (e) { }
        }

        if (signalData) {
          const classification = await this.signalService.classifySignal(signalData);
          analysisText = `RF Signal Analysis: ${classification.label} (Confidence: ${classification.confidence}). 
                         Tags: ${classification.tags.join(', ')}. Threat Level: ${classification.threatLevel}.
                         Frequency: ${signalData.frequency} Hz. Bandwidth: ${signalData.bandwidth} Hz.`;
        }
      }

      const textToAnalyze = type === 'TEXT' ? content : analysisText;
      const extraction = await this.extractEntities(textToAnalyze, type);

      // 3. Generate Content Embedding
      let contentEmbedding = null;
      if (type === 'TEXT' || analysisText) {
        contentEmbedding = await this.embeddingService.generateEmbedding({ text: textToAnalyze });
      }

      // 4. Save to Postgres
      const entityPromises = extraction.entities.map(async (entity) => {
        const entityId = randomUUID();
        const entityEmbedding = await this.embeddingService.generateEmbedding({ text: `${entity.label} ${entity.description || ''}` });

        await this.db.query(
          `INSERT INTO multimodal_entities (
            id, tenant_id, investigation_id, media_source_id, entity_type, extracted_text,
            confidence, text_embedding, metadata, extraction_method
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            entityId,
            tenantId,
            investigationId,
            mediaSourceId,
            entity.type,
            entity.label,
            entity.confidence,
            JSON.stringify(entityEmbedding),
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
          await tx.run(
            `MERGE (m:MediaSource {id: $id, tenantId: $tenantId})
             SET m.uri = $uri, m.type = $type, m.metadata = $metadata`,
            { id: mediaSourceId, tenantId, uri: type === 'URL' ? content : 'raw-input', type, metadata: JSON.stringify(metadata) }
          );

          for (const entity of processedEntities) {
            await tx.run(
              `MERGE (e:Entity {name: $name, type: $type, tenantId: $tenantId})
               ON CREATE SET e.id = $uuid, e.description = $desc
               MERGE (m:MediaSource {id: $sourceId, tenantId: $tenantId})
               MERGE (m)-[:MENTIONS {confidence: $conf}]->(e)`,
              {
                name: entity.label,
                type: entity.type,
                tenantId,
                uuid: entity.uuid,
                desc: entity.description || '',
                sourceId: mediaSourceId,
                conf: entity.confidence
              }
            );
          }

          for (const rel of extraction.relationships) {
            const sourceEntity = processedEntities.find(e => e.label === rel.sourceId || e.id === rel.sourceId);
            const targetEntity = processedEntities.find(e => e.label === rel.targetId || e.id === rel.targetId);

            if (sourceEntity && targetEntity) {
              await tx.run(
                `MATCH (a:Entity {id: $idA, tenantId: $tenantId}), (b:Entity {id: $idB, tenantId: $tenantId})
                 MERGE (a)-[r:RELATED_TO {type: $relType}]->(b)
                 SET r.description = $desc, r.confidence = $conf`,
                {
                  idA: sourceEntity.uuid,
                  idB: targetEntity.uuid,
                  tenantId,
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

    } catch (error: any) {
      logger.error('Ingestion failed', error);
      await this.db.query(
        `UPDATE media_sources SET processing_status = 'FAILED' WHERE id = $1`,
        [mediaSourceId]
      );
      throw error;
    }
  }

  async search(tenantId: string, query: string, limit: number = 10): Promise<SearchResult[]> {
    const queryEmbedding = await this.embeddingService.generateEmbedding({ text: query });

    const vectorRes = await this.db.query(
      `SELECT id, extracted_text, entity_type, confidence, 1 - (text_embedding <=> $1) as score, metadata
       FROM multimodal_entities
       WHERE tenant_id = $3
       ORDER BY text_embedding <=> $1 ASC
       LIMIT $2`,
      [JSON.stringify(queryEmbedding), limit, tenantId]
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

    const session = this.neo4j.session();
    let graphHits: SearchResult[] = [];

    try {
      const graphRes = await session.run(
        `CALL db.index.fulltext.queryNodes("entity_search", $query) YIELD node, score
         WITH node, score
         WHERE node.tenantId = $tenantId
         RETURN node.id as id, node.name as name, node.type as type, node.description as desc, score
         LIMIT $limit`,
        { query, limit, tenantId }
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

    } catch (e: any) {
      logger.warn('Graph search failed', e);
    } finally {
      await session.close();
    }

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
    } catch (e: any) {
      logger.error('Failed to load prompt file', e);
      template = `Extract entities (Person, Org, Loc) from: {{text}}. Return JSON {entities:[], relationships:[]}`;
    }

    let promptTemplate = '';
    try {
      const doc = load(template) as any;
      promptTemplate = doc.template || template;
    } catch (e: any) {
      logger.warn('Failed to parse prompt YAML, falling back to raw text', e);
      promptTemplate = template;
    }

    const filledPrompt = promptTemplate
      .replace('{{text}}', text)
      .replace('{{source_type}}', sourceType);

    const resultStr = await this.llmService.complete(filledPrompt, {
      model: 'gpt-4o',
      temperature: 0.0,
      responseFormat: 'json'
    });

    try {
      return JSON.parse(resultStr) as ExtractionResult;
    } catch (e: any) {
      logger.error('Failed to parse LLM JSON', e);
      return { entities: [], relationships: [] };
    }
  }
}
