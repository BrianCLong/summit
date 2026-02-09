
import { logger } from '../config/logger.js';
import { MaestroLLMService } from '../services/llm/MaestroLLMService.js';

export interface MappingSuggestion {
  sourceField: string;
  targetField: string;
  confidence: number;
  reasoning: string;
}

export interface SchemaMapping {
  targetType: string;
  mappings: MappingSuggestion[];
  overallConfidence: number;
}

/**
 * Service for autonomously mapping raw data schemas to the IntelGraph Ontology.
 * Task #108: Semantic Consistency Engine.
 * Evolves from heuristic mapping to LLM-driven autonomous alignment.
 */
export class SemanticMapperService {
  private static instance: SemanticMapperService;
  private llmService: MaestroLLMService;

  // Internal ontology definitions for mapping targets
  private ontology = {
    Person: ['name', 'email', 'phone', 'birthDate', 'role', 'nationality', 'employer'],
    Organization: ['name', 'website', 'industry', 'foundedDate', 'location', 'tickerSymbol', 'parentCompany'],
    Event: ['title', 'timestamp', 'description', 'location', 'participants', 'eventType', 'severity'],
    Asset: ['id', 'type', 'owner', 'value', 'status', 'acquisitionDate']
  };

  private constructor() {
    this.llmService = MaestroLLMService.getInstance();
  }

  public static getInstance(): SemanticMapperService {
    if (!SemanticMapperService.instance) {
      SemanticMapperService.instance = new SemanticMapperService();
    }
    return SemanticMapperService.instance;
  }

  /**
   * Analyzes a raw JSON object and suggests a mapping to the internal Ontology using LLM reasoning.
   */
  public async suggestMapping(sampleRecord: Record<string, any>, context?: string): Promise<SchemaMapping> {
    const keys = Object.keys(sampleRecord);
    logger.info({ keys, context }, 'SemanticMapper: Initiating autonomous mapping');

    try {
      const prompt = `
        You are the IntelGraph Semantic Consistency Engine (Task #108).
        Your task is to map a raw data schema to the IntelGraph Ontology.

        Ontology Targets:
        ${JSON.stringify(this.ontology, null, 2)}

        Raw Data Sample Keys:
        ${JSON.stringify(keys)}

        Context: ${context || 'General data ingestion'}

        Instructions:
        1. Identify the most likely Target Type from the Ontology.
        2. Map EACH source field to the most appropriate target field.
        3. If no match exists, map to "custom_<original_name>".
        4. Provide reasoning for each mapping.
        5. Return a JSON object with: targetType, overallConfidence (0-1), and mappings (array of {sourceField, targetField, confidence, reasoning}).

        JSON Response Only:
      `;

      const llmResult = await this.llmService.executeTaskLLM({
        taskType: 'analysis',
        prompt,
        metadata: { component: 'SemanticMapper', task: 'suggestMapping' }
      });

      if (llmResult.ok && llmResult.text) {
        try {
          const mapping = JSON.parse(llmResult.text.replace(/```json|```/g, '')) as SchemaMapping;
          logger.info({ targetType: mapping.targetType }, 'SemanticMapper: LLM mapping successful');
          return mapping;
        } catch (parseErr) {
          logger.error({ parseErr }, 'SemanticMapper: Failed to parse LLM response, falling back to heuristic');
        }
      }
    } catch (err) {
      logger.error({ err }, 'SemanticMapper: LLM execution failed, falling back to heuristic');
    }

    return this.suggestHeuristicMapping(sampleRecord);
  }

  /**
   * Fallback heuristic mapping logic.
   */
  private suggestHeuristicMapping(sampleRecord: Record<string, any>): SchemaMapping {
    const keys = Object.keys(sampleRecord);
    let bestMatch = { type: 'Unknown', score: 0 };

    for (const [type, fields] of Object.entries(this.ontology)) {
      let score = 0;
      for (const key of keys) {
        if (fields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
          score += 1;
        }
      }
      const normalizedScore = score / keys.length;
      if (normalizedScore > bestMatch.score) {
        bestMatch = { type, score: normalizedScore };
      }
    }

    // Task #108: Lowered threshold for development drills when LLM is unavailable
    if (bestMatch.score < 0.1) {
      logger.warn({ score: bestMatch.score }, 'SemanticMapper: Extremely low confidence in type detection');
      // If we still found a "best" type, we proceed, otherwise default to Unstructured
      if (bestMatch.type === 'Unknown') {
        return {
          targetType: 'Unstructured',
          mappings: keys.map(k => ({
            sourceField: k,
            targetField: `custom_${k}`,
            confidence: 0.1,
            reasoning: 'Unstructured fallback'
          })),
          overallConfidence: 0
        };
      }
    }

    const mappings: MappingSuggestion[] = [];
    const targetFields = this.ontology[bestMatch.type as keyof typeof this.ontology] || [];

    for (const sourceKey of keys) {
      const lowerKey = sourceKey.toLowerCase();
      const match = targetFields.find(t => lowerKey.includes(t.toLowerCase()) || t.toLowerCase().includes(lowerKey));

      mappings.push({
        sourceField: sourceKey,
        targetField: match || `custom_${sourceKey}`,
        confidence: match ? 0.8 : 0.4,
        reasoning: match ? 'Heuristic match' : 'No direct match found'
      });
    }

    return {
      targetType: bestMatch.type,
      mappings,
      overallConfidence: bestMatch.score
    };
  }

  /**
   * Applies a mapping to transform a raw record into a canonical entity.
   */
  public applyMapping(record: Record<string, any>, mapping: SchemaMapping): Record<string, any> {
    const entity: Record<string, any> = {
      type: mapping.targetType,
      _metadata: {
        mappedAt: new Date().toISOString(),
        confidence: mapping.overallConfidence,
        engine: 'SemanticMapperService v2'
      }
    };

    for (const map of mapping.mappings) {
      const value = record[map.sourceField];
      if (value !== undefined) {
        entity[map.targetField] = value;
      }
    }

    return entity;
  }
}

export const semanticMapperService = SemanticMapperService.getInstance();
