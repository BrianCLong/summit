/**
 * Fact Extractor for Long-Term Memory
 *
 * Extracts structured facts from conversation summaries for storage in Neo4j.
 *
 * Extraction Categories:
 * - Findings: Discovered information, insights, correlations
 * - Decisions: Choices made, actions taken, conclusions reached
 * - Preferences: User preferences, working styles, priorities
 * - Context: Background information, assumptions, constraints
 * - Hypotheses: Theories, predictions, speculative connections
 *
 * Features:
 * - Confidence scoring
 * - Entity linking
 * - Relationship inference
 * - Contradiction detection
 * - Fact deduplication
 */

import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';

import { EmbeddingService } from '../embeddings/embedding-service.js';
import { ConversationGraphRepository, ConversationFactNode } from '../db/neo4j-schema.js';

// =============================================================================
// TYPES
// =============================================================================

export interface FactExtractorConfig {
  anthropicApiKey: string;
  model?: string;
  embeddingService: EmbeddingService;
  graphRepository: ConversationGraphRepository;
  deduplicationThreshold?: number; // Similarity threshold for deduplication
  minConfidence?: number; // Minimum confidence to store
}

export interface ExtractedFactWithEmbedding {
  factId: string;
  content: string;
  category: 'finding' | 'decision' | 'preference' | 'context' | 'hypothesis';
  confidence: number;
  embedding: number[];
  sourceTurnIds: string[];
  sourceSummaryId?: string;
  relatedEntities: string[];
  relatedFacts: string[];
  contradicts?: string[]; // IDs of facts this contradicts
}

export interface ExtractionResult {
  facts: ExtractedFactWithEmbedding[];
  relationships: Array<{
    sourceFactId: string;
    targetFactId: string;
    relationshipType: string;
    confidence: number;
  }>;
  duplicatesSkipped: number;
  contradictionsFound: number;
}

// =============================================================================
// PROMPTS
// =============================================================================

const EXTRACTION_SYSTEM_PROMPT = `You are an intelligence analyst specializing in knowledge extraction.
Your task is to extract discrete, atomic facts from conversation summaries.

Guidelines:
1. Each fact should be a single, self-contained statement
2. Facts should be objective and verifiable where possible
3. Assign confidence based on evidence strength (0.0-1.0)
4. Identify the category: finding, decision, preference, context, or hypothesis
5. Note any entities mentioned in the fact
6. Identify relationships between facts

Output format (JSON array):
[
  {
    "content": "Atomic fact statement",
    "category": "finding|decision|preference|context|hypothesis",
    "confidence": 0.0-1.0,
    "entities": ["entity1", "entity2"],
    "related_to": [0, 2], // indices of related facts in this batch
    "relationship_types": ["supports", "elaborates"], // relationship to related facts
    "evidence": "Brief note on what supports this fact"
  }
]`;

const EXTRACTION_USER_PROMPT = (summary: string, existingFacts: string[]) => `
Extract facts from this conversation summary:

${summary}

${existingFacts.length > 0 ? `\nExisting facts in this session (check for contradictions and avoid duplicates):\n${existingFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}` : ''}

Provide your response as a valid JSON array.`;

const CONTRADICTION_PROMPT = (newFact: string, existingFacts: string[]) => `
Analyze if this new fact contradicts any existing facts:

New fact: "${newFact}"

Existing facts:
${existingFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}

If there are contradictions, respond with JSON:
{
  "contradicts": [indices of contradicting facts],
  "explanation": "brief explanation of the contradiction"
}

If no contradictions, respond with:
{"contradicts": [], "explanation": "no contradictions found"}`;

// =============================================================================
// FACT EXTRACTOR
// =============================================================================

export class FactExtractor {
  private client: Anthropic;
  private config: Required<FactExtractorConfig>;
  private embeddingService: EmbeddingService;
  private graphRepo: ConversationGraphRepository;

  constructor(config: FactExtractorConfig) {
    this.client = new Anthropic({
      apiKey: config.anthropicApiKey,
    });

    this.config = {
      model: config.model ?? 'claude-sonnet-4-20250514',
      deduplicationThreshold: config.deduplicationThreshold ?? 0.9,
      minConfidence: config.minConfidence ?? 0.5,
      anthropicApiKey: config.anthropicApiKey,
      embeddingService: config.embeddingService,
      graphRepository: config.graphRepository,
    };

    this.embeddingService = config.embeddingService;
    this.graphRepo = config.graphRepository;
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Extract facts from a summary and store in Neo4j
   */
  async extractAndStore(
    summary: string,
    metadata: {
      sessionId: string;
      userId: string;
      tenantId: string;
      summaryId?: string;
      turnIds: string[];
    },
  ): Promise<ExtractionResult> {
    // Get existing facts for deduplication and contradiction checking
    const existingFacts = await this.graphRepo.findFactsBySession(
      metadata.sessionId,
      metadata.tenantId,
      100,
    );

    const existingFactContents = existingFacts.map((f) => f.content);

    // Extract facts using LLM
    const extractedFacts = await this.extractFacts(summary, existingFactContents);

    // Generate embeddings
    const embeddings = await this.embeddingService.embedBatch(extractedFacts.map((f) => f.content));

    // Deduplicate against existing facts
    const { unique, duplicatesSkipped } = await this.deduplicateFacts(
      extractedFacts,
      embeddings.embeddings.map((e) => e.embedding),
      existingFacts,
    );

    // Check for contradictions
    const contradictionsFound = await this.checkContradictions(unique, existingFactContents);

    // Build full fact objects
    const factsWithEmbeddings: ExtractedFactWithEmbedding[] = unique.map((fact, i) => ({
      factId: uuidv4(),
      content: fact.content,
      category: fact.category,
      confidence: fact.confidence,
      embedding: embeddings.embeddings[extractedFacts.indexOf(fact)].embedding,
      sourceTurnIds: metadata.turnIds,
      sourceSummaryId: metadata.summaryId,
      relatedEntities: fact.entities,
      relatedFacts: fact.related_to.map((idx) => unique[idx]?.factId).filter(Boolean) as string[],
      contradicts: fact.contradicts,
    }));

    // Store in Neo4j
    for (const fact of factsWithEmbeddings) {
      if (fact.confidence >= this.config.minConfidence) {
        await this.graphRepo.createFact({
          factId: fact.factId,
          tenantId: metadata.tenantId,
          userId: metadata.userId,
          sessionId: metadata.sessionId,
          content: fact.content,
          category: fact.category,
          confidence: fact.confidence,
          sourceTurnIds: fact.sourceTurnIds,
          sourceSummaryId: fact.sourceSummaryId,
          embedding: fact.embedding,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // Create relationships between facts
    const relationships: ExtractionResult['relationships'] = [];
    for (const fact of unique) {
      for (let i = 0; i < fact.related_to.length; i++) {
        const relatedIdx = fact.related_to[i];
        const relatedFact = unique[relatedIdx];
        if (relatedFact) {
          const factObj = factsWithEmbeddings.find((f) => f.content === fact.content);
          const relatedFactObj = factsWithEmbeddings.find((f) => f.content === relatedFact.content);

          if (factObj && relatedFactObj) {
            relationships.push({
              sourceFactId: factObj.factId,
              targetFactId: relatedFactObj.factId,
              relationshipType: fact.relationship_types[i] ?? 'related_to',
              confidence: Math.min(fact.confidence, relatedFact.confidence),
            });

            await this.graphRepo.linkFactsAsRelated(
              factObj.factId,
              relatedFactObj.factId,
              fact.relationship_types[i] ?? 'related_to',
              Math.min(fact.confidence, relatedFact.confidence),
              metadata.tenantId,
            );
          }
        }
      }
    }

    return {
      facts: factsWithEmbeddings,
      relationships,
      duplicatesSkipped,
      contradictionsFound,
    };
  }

  /**
   * Find facts similar to a query
   */
  async findSimilarFacts(
    query: string,
    tenantId: string,
    options?: {
      limit?: number;
      minSimilarity?: number;
      categories?: string[];
    },
  ): Promise<Array<{ fact: ConversationFactNode; similarity: number }>> {
    const queryEmbedding = await this.embeddingService.embed(query);

    const results = await this.graphRepo.searchFactsBySimilarity(
      queryEmbedding.embedding,
      tenantId,
      options?.limit ?? 10,
    );

    return results.filter((r) => r.similarity >= (options?.minSimilarity ?? 0.7));
  }

  /**
   * Verify a fact against existing knowledge
   */
  async verifyFact(
    factId: string,
    verifierId: string,
    tenantId: string,
  ): Promise<void> {
    // This would update the fact's verified status in Neo4j
    // Implementation depends on graph schema
  }

  // ===========================================================================
  // INTERNAL METHODS
  // ===========================================================================

  private async extractFacts(
    summary: string,
    existingFacts: string[],
  ): Promise<
    Array<{
      content: string;
      category: 'finding' | 'decision' | 'preference' | 'context' | 'hypothesis';
      confidence: number;
      entities: string[];
      related_to: number[];
      relationship_types: string[];
      evidence: string;
      contradicts?: string[];
    }>
  > {
    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: 2000,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: EXTRACTION_USER_PROMPT(summary, existingFacts),
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((f: any) => ({
        content: f.content ?? '',
        category: f.category ?? 'context',
        confidence: f.confidence ?? 0.5,
        entities: f.entities ?? [],
        related_to: f.related_to ?? [],
        relationship_types: f.relationship_types ?? [],
        evidence: f.evidence ?? '',
      }));
    } catch {
      return [];
    }
  }

  private async deduplicateFacts(
    newFacts: Array<{
      content: string;
      category: string;
      confidence: number;
      entities: string[];
      related_to: number[];
      relationship_types: string[];
    }>,
    newEmbeddings: number[][],
    existingFacts: ConversationFactNode[],
  ): Promise<{
    unique: typeof newFacts;
    duplicatesSkipped: number;
  }> {
    const unique: typeof newFacts = [];
    let duplicatesSkipped = 0;

    for (let i = 0; i < newFacts.length; i++) {
      const newFact = newFacts[i];
      const newEmbedding = newEmbeddings[i];
      let isDuplicate = false;

      // Check against existing facts
      for (const existingFact of existingFacts) {
        if (existingFact.embedding) {
          const similarity = this.embeddingService.cosineSimilarity(
            newEmbedding,
            existingFact.embedding,
          );

          if (similarity >= this.config.deduplicationThreshold) {
            isDuplicate = true;
            duplicatesSkipped++;
            break;
          }
        }
      }

      // Check against other new facts
      if (!isDuplicate) {
        for (let j = 0; j < i; j++) {
          const similarity = this.embeddingService.cosineSimilarity(newEmbedding, newEmbeddings[j]);

          if (similarity >= this.config.deduplicationThreshold) {
            isDuplicate = true;
            duplicatesSkipped++;
            break;
          }
        }
      }

      if (!isDuplicate) {
        unique.push(newFact);
      }
    }

    return { unique, duplicatesSkipped };
  }

  private async checkContradictions(
    facts: Array<{ content: string; contradicts?: string[] }>,
    existingFactContents: string[],
  ): Promise<number> {
    if (existingFactContents.length === 0) {
      return 0;
    }

    let contradictionsFound = 0;

    for (const fact of facts) {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: CONTRADICTION_PROMPT(fact.content, existingFactContents),
          },
        ],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.contradicts && parsed.contradicts.length > 0) {
            fact.contradicts = parsed.contradicts.map(
              (idx: number) => `existing-fact-${idx}`,
            );
            contradictionsFound++;
          }
        }
      } catch {
        // Ignore parsing errors
      }
    }

    return contradictionsFound;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createFactExtractor(config: FactExtractorConfig): FactExtractor {
  return new FactExtractor(config);
}
