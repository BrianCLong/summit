/**
 * LLM-Based Turn Compressor
 *
 * Compresses conversation turns into summaries for medium-term memory.
 *
 * Compression Strategy:
 * 1. Extract key facts and decisions
 * 2. Identify entity mentions
 * 3. Track open questions
 * 4. Generate hierarchical summary
 * 5. Preserve intent and outcome
 *
 * Features:
 * - Configurable compression ratio
 * - Multi-turn batching
 * - Intent preservation
 * - Entity extraction during compression
 * - Quality scoring
 */

import Anthropic from '@anthropic-ai/sdk';
import { ConversationTurn, TurnSummary, ExtractedFact, Decision, OSINTEntity } from '../types.js';

// =============================================================================
// TYPES
// =============================================================================

export interface CompressionConfig {
  anthropicApiKey: string;
  model?: string;
  targetCompressionRatio?: number; // e.g., 0.3 = compress to 30% of original
  maxOutputTokens?: number;
  preserveEntityMentions?: boolean;
  extractFacts?: boolean;
  extractDecisions?: boolean;
}

export interface CompressionResult {
  summary: TurnSummary;
  facts: ExtractedFact[];
  decisions: Decision[];
  entities: OSINTEntity[];
  openQuestions: string[];
  compressionRatio: number;
  qualityScore: number;
}

export interface BatchCompressionResult {
  summaries: CompressionResult[];
  totalInputTokens: number;
  totalOutputTokens: number;
  averageCompressionRatio: number;
}

// =============================================================================
// PROMPTS
// =============================================================================

const COMPRESSION_SYSTEM_PROMPT = `You are an intelligence analyst assistant specializing in conversation summarization.
Your task is to compress conversation turns while preserving critical information.

You MUST extract and preserve:
1. Key facts discovered or stated
2. Decisions made or pending
3. Entity mentions (people, organizations, locations, threat actors, infrastructure)
4. Open questions that need resolution
5. The overall intent and outcome of the conversation segment

Output format (JSON):
{
  "summary": "Concise summary of the conversation segment",
  "key_facts": [
    {"content": "fact statement", "category": "finding|decision|preference|context", "confidence": 0.0-1.0}
  ],
  "decisions": [
    {"description": "what was decided", "rationale": "why"}
  ],
  "entities": [
    {"type": "THREAT_ACTOR|INFRASTRUCTURE|MALWARE|...", "value": "entity value", "confidence": 0.0-1.0}
  ],
  "open_questions": ["question 1", "question 2"],
  "primary_intent": "what the user was trying to accomplish",
  "outcome": "success|partial|failed"
}`;

const COMPRESSION_USER_PROMPT = (turns: ConversationTurn[], maxTokens: number) => `
Compress the following conversation segment into a summary of approximately ${maxTokens} tokens.

Conversation:
${turns.map((t) => `[${t.role.toUpperCase()}] ${t.content}`).join('\n\n')}

Provide your response as valid JSON.`;

// =============================================================================
// TURN COMPRESSOR
// =============================================================================

export class TurnCompressor {
  private client: Anthropic;
  private config: Required<CompressionConfig>;

  constructor(config: CompressionConfig) {
    this.client = new Anthropic({
      apiKey: config.anthropicApiKey,
    });

    this.config = {
      model: config.model ?? 'claude-sonnet-4-20250514',
      targetCompressionRatio: config.targetCompressionRatio ?? 0.3,
      maxOutputTokens: config.maxOutputTokens ?? 1000,
      preserveEntityMentions: config.preserveEntityMentions ?? true,
      extractFacts: config.extractFacts ?? true,
      extractDecisions: config.extractDecisions ?? true,
      anthropicApiKey: config.anthropicApiKey,
    };
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Compress a batch of turns into a single summary
   */
  async compress(turns: ConversationTurn[]): Promise<CompressionResult> {
    if (turns.length === 0) {
      throw new Error('Cannot compress empty turn list');
    }

    // Calculate target output size
    const totalInputTokens = turns.reduce((sum, t) => sum + t.tokenCount, 0);
    const targetOutputTokens = Math.ceil(totalInputTokens * this.config.targetCompressionRatio);

    // Generate compression
    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxOutputTokens,
      system: COMPRESSION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: COMPRESSION_USER_PROMPT(turns, targetOutputTokens),
        },
      ],
    });

    // Parse response
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = this.parseCompressionResponse(text);

    // Build result
    const summary: TurnSummary = {
      turnIds: turns.map((t) => t.turnId),
      summary: parsed.summary,
      entities: parsed.entities.map((e) => e.value),
      intent: parsed.primary_intent,
      outcome: parsed.outcome as 'success' | 'partial' | 'failed',
      tokenCount: Math.ceil(parsed.summary.length / 4),
      timestamp: new Date(),
    };

    const facts: ExtractedFact[] = parsed.key_facts.map((f, i) => ({
      factId: `fact-${turns[0].turnId}-${i}`,
      content: f.content,
      turnIds: turns.map((t) => t.turnId),
      confidence: f.confidence,
      category: f.category as 'finding' | 'decision' | 'preference' | 'context',
    }));

    const decisions: Decision[] = parsed.decisions.map((d, i) => ({
      decisionId: `decision-${turns[0].turnId}-${i}`,
      description: d.description,
      turnId: turns[turns.length - 1].turnId,
      timestamp: turns[turns.length - 1].timestamp,
      rationale: d.rationale,
    }));

    const entities: OSINTEntity[] = parsed.entities.map((e) => ({
      type: e.type as OSINTEntity['type'],
      value: e.value,
      confidence: e.confidence,
      source: 'llm',
    }));

    const compressionRatio = summary.tokenCount / totalInputTokens;
    const qualityScore = this.calculateQualityScore(turns, summary, facts, entities);

    return {
      summary,
      facts,
      decisions,
      entities,
      openQuestions: parsed.open_questions,
      compressionRatio,
      qualityScore,
    };
  }

  /**
   * Compress multiple turn batches in parallel
   */
  async compressBatch(turnBatches: ConversationTurn[][]): Promise<BatchCompressionResult> {
    const results = await Promise.all(turnBatches.map((batch) => this.compress(batch)));

    const totalInputTokens = turnBatches.flat().reduce((sum, t) => sum + t.tokenCount, 0);
    const totalOutputTokens = results.reduce((sum, r) => sum + r.summary.tokenCount, 0);
    const averageCompressionRatio =
      results.reduce((sum, r) => sum + r.compressionRatio, 0) / results.length;

    return {
      summaries: results,
      totalInputTokens,
      totalOutputTokens,
      averageCompressionRatio,
    };
  }

  /**
   * Incrementally compress: add new turns to existing summary
   */
  async incrementalCompress(
    existingSummary: TurnSummary | null,
    newTurns: ConversationTurn[],
  ): Promise<CompressionResult> {
    if (!existingSummary) {
      return this.compress(newTurns);
    }

    // Create a synthetic turn from the existing summary
    const summaryTurn: ConversationTurn = {
      turnId: 'summary-synthetic',
      sessionId: newTurns[0].sessionId,
      userId: newTurns[0].userId,
      tenantId: newTurns[0].tenantId,
      role: 'system',
      content: `[PREVIOUS CONTEXT SUMMARY]\n${existingSummary.summary}\n\nKey entities mentioned: ${existingSummary.entities.join(', ')}\nPrimary intent: ${existingSummary.intent}`,
      timestamp: existingSummary.timestamp,
      tokenCount: existingSummary.tokenCount,
    };

    // Compress the combined context
    return this.compress([summaryTurn, ...newTurns]);
  }

  /**
   * Generate hierarchical summary from multiple summaries
   */
  async hierarchicalCompress(summaries: TurnSummary[]): Promise<CompressionResult> {
    if (summaries.length === 0) {
      throw new Error('Cannot compress empty summary list');
    }

    if (summaries.length === 1) {
      return {
        summary: summaries[0],
        facts: [],
        decisions: [],
        entities: [],
        openQuestions: [],
        compressionRatio: 1,
        qualityScore: 1,
      };
    }

    // Convert summaries to synthetic turns
    const syntheticTurns: ConversationTurn[] = summaries.map((s, i) => ({
      turnId: s.turnIds[0],
      sessionId: 'hierarchical',
      userId: 'system',
      tenantId: 'system',
      role: 'system',
      content: `[SEGMENT ${i + 1}]\n${s.summary}\nIntent: ${s.intent}\nOutcome: ${s.outcome}\nEntities: ${s.entities.join(', ')}`,
      timestamp: s.timestamp,
      tokenCount: s.tokenCount,
    }));

    return this.compress(syntheticTurns);
  }

  // ===========================================================================
  // INTERNAL METHODS
  // ===========================================================================

  private parseCompressionResponse(text: string): {
    summary: string;
    key_facts: Array<{ content: string; category: string; confidence: number }>;
    decisions: Array<{ description: string; rationale: string }>;
    entities: Array<{ type: string; value: string; confidence: number }>;
    open_questions: string[];
    primary_intent: string;
    outcome: string;
  } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        summary: parsed.summary ?? text.slice(0, 500),
        key_facts: parsed.key_facts ?? [],
        decisions: parsed.decisions ?? [],
        entities: parsed.entities ?? [],
        open_questions: parsed.open_questions ?? [],
        primary_intent: parsed.primary_intent ?? 'unknown',
        outcome: parsed.outcome ?? 'partial',
      };
    } catch (error) {
      // Fallback: use the raw text as summary
      return {
        summary: text.slice(0, 500),
        key_facts: [],
        decisions: [],
        entities: [],
        open_questions: [],
        primary_intent: 'unknown',
        outcome: 'partial',
      };
    }
  }

  private calculateQualityScore(
    originalTurns: ConversationTurn[],
    summary: TurnSummary,
    facts: ExtractedFact[],
    entities: OSINTEntity[],
  ): number {
    let score = 0;

    // Base score for having a summary
    if (summary.summary.length > 0) score += 0.3;

    // Score for extracting facts
    if (facts.length > 0) score += 0.2;

    // Score for entity extraction
    const originalEntityCount = originalTurns.filter(
      (t) => t.metadata?.entities && t.metadata.entities.length > 0,
    ).length;
    if (originalEntityCount > 0 && entities.length > 0) {
      score += 0.2 * Math.min(entities.length / originalEntityCount, 1);
    } else {
      score += 0.1;
    }

    // Score for intent preservation
    if (summary.intent && summary.intent !== 'unknown') score += 0.15;

    // Score for reasonable compression ratio
    const totalOriginalTokens = originalTurns.reduce((sum, t) => sum + t.tokenCount, 0);
    const ratio = summary.tokenCount / totalOriginalTokens;
    if (ratio >= 0.1 && ratio <= 0.5) score += 0.15;

    return Math.min(score, 1);
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createTurnCompressor(config: CompressionConfig): TurnCompressor {
  return new TurnCompressor(config);
}
