
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

type OntologyTargetType = 'Person' | 'Organization' | 'Event' | 'Asset';

/**
 * Service for autonomously mapping raw data schemas to the IntelGraph Ontology.
 * Task #108: Semantic Consistency Engine.
 * Evolves from heuristic mapping to LLM-driven autonomous alignment.
 */
export class SemanticMapperService {
  private static instance: SemanticMapperService;
  private llmService: MaestroLLMService;

  // Internal ontology definitions for mapping targets
  private ontology: Record<OntologyTargetType, string[]> = {
    Person: ['name', 'email', 'phone', 'birthDate', 'role', 'nationality', 'employer'],
    Organization: ['name', 'website', 'industry', 'foundedDate', 'location', 'tickerSymbol', 'parentCompany'],
    Event: ['title', 'timestamp', 'description', 'location', 'participants', 'eventType', 'severity'],
    Asset: ['id', 'type', 'owner', 'value', 'status', 'acquisitionDate']
  };
  private fieldAliases: Record<
    string,
    { targetType: OntologyTargetType; targetField: string; weight?: number }
  > = {
    full_name: { targetType: 'Person', targetField: 'name', weight: 1.1 },
    contact_email: { targetType: 'Person', targetField: 'email', weight: 1.1 },
    job_role: { targetType: 'Person', targetField: 'role', weight: 1.1 },
    company_name: { targetType: 'Organization', targetField: 'name', weight: 1.3 },
    org_name: { targetType: 'Organization', targetField: 'name', weight: 1.3 },
    web_address: { targetType: 'Organization', targetField: 'website', weight: 1.3 },
    homepage: { targetType: 'Organization', targetField: 'website', weight: 1.2 },
    founded_in: { targetType: 'Organization', targetField: 'foundedDate', weight: 1.2 }
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

  private normalizeToken(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private fieldMatchesKey(sourceKey: string, ontologyField: string): boolean {
    const normalizedSource = this.normalizeToken(sourceKey);
    const normalizedField = this.normalizeToken(ontologyField);
    if (!normalizedSource || !normalizedField) {
      return false;
    }
    if (normalizedSource === normalizedField) {
      return true;
    }
    // Avoid false positives from single-character keys (e.g. x/y/z).
    if (normalizedSource.length < 3 || normalizedField.length < 3) {
      return false;
    }
    return (
      normalizedSource.includes(normalizedField) || normalizedField.includes(normalizedSource)
    );
  }

  /**
   * Fallback heuristic mapping logic.
   */
  private suggestHeuristicMapping(sampleRecord: Record<string, any>): SchemaMapping {
    const keys = Object.keys(sampleRecord);
    let bestMatch: { type: OntologyTargetType | 'Unknown'; score: number } = {
      type: 'Unknown',
      score: 0
    };

    for (const [type, fields] of Object.entries(this.ontology)) {
      let score = 0;
      for (const key of keys) {
        if (fields.some(f => this.fieldMatchesKey(key, f))) {
          score += 1;
        }

        const alias = this.fieldAliases[key.toLowerCase()];
        if (alias && alias.targetType === type) {
          score += alias.weight ?? 1;
        }
      }
      const normalizedScore = score / keys.length;
      if (normalizedScore > bestMatch.score) {
        bestMatch = { type: type as OntologyTargetType, score: normalizedScore };
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
      const alias = this.fieldAliases[sourceKey.toLowerCase()];
      const aliasMatch = alias && alias.targetType === bestMatch.type ? alias.targetField : null;
      const match =
        aliasMatch ||
        targetFields.find(t => this.fieldMatchesKey(sourceKey, t));

      mappings.push({
        sourceField: sourceKey,
        targetField: match || `custom_${sourceKey}`,
        confidence: aliasMatch ? 0.9 : match ? 0.8 : 0.4,
        reasoning: aliasMatch
          ? 'Alias heuristic match'
          : match
            ? 'Heuristic match'
            : 'No direct match found'
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
