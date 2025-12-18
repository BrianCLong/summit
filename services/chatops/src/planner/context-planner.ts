/**
 * Context Planner with Token Optimization
 *
 * Intelligently selects and constructs context for LLM calls:
 * - Token budget management across context sources
 * - Priority-based context selection
 * - Semantic relevance scoring
 * - Dynamic context window adaptation
 * - Multi-tier memory integration
 *
 * Context Sources (by priority):
 * 1. System instructions (fixed)
 * 2. Active investigation context
 * 3. Recent conversation turns
 * 4. Relevant summaries
 * 5. Long-term memory facts
 * 6. Entity context from knowledge graph
 * 7. Tool documentation
 */

import Anthropic from '@anthropic-ai/sdk';
import { encode } from 'gpt-tokenizer';

import type { EmbeddingService } from '../embeddings/embedding-service.js';
import type {
  ConversationTurn,
  OSINTEntity,
  MemoryTier,
} from '../types.js';

// =============================================================================
// TYPES
// =============================================================================

export interface ContextPlannerConfig {
  maxTokenBudget: number;
  minReservedForResponse: number;
  embeddingService: EmbeddingService;
  llmClient?: Anthropic;
  weights?: ContextWeights;
  thresholds?: ContextThresholds;
}

export interface ContextWeights {
  systemInstructions: number;
  investigation: number;
  recentTurns: number;
  summaries: number;
  facts: number;
  entityContext: number;
  toolDocs: number;
}

export interface ContextThresholds {
  minRelevanceScore: number;
  maxTurnsToConsider: number;
  maxFactsToInclude: number;
  maxEntitiesContext: number;
  recencyDecayFactor: number;
}

export interface ContextSource {
  id: string;
  type: 'system' | 'investigation' | 'turn' | 'summary' | 'fact' | 'entity' | 'tool';
  content: string;
  tokenCount: number;
  priority: number;
  relevanceScore: number;
  recencyScore: number;
  combinedScore: number;
  metadata?: Record<string, unknown>;
}

export interface ContextPlan {
  sources: ContextSource[];
  totalTokens: number;
  budgetUsed: number;
  budgetRemaining: number;
  excludedSources: Array<{
    source: ContextSource;
    reason: string;
  }>;
  statistics: {
    systemTokens: number;
    conversationTokens: number;
    memoryTokens: number;
    entityTokens: number;
    toolTokens: number;
  };
}

export interface ContextBudget {
  total: number;
  system: number;
  conversation: number;
  memory: number;
  entity: number;
  tools: number;
}

export interface PlannedContext {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  plan: ContextPlan;
}

// =============================================================================
// CONTEXT PLANNER
// =============================================================================

export class ContextPlanner {
  private config: ContextPlannerConfig;
  private weights: ContextWeights;
  private thresholds: ContextThresholds;
  private embeddingService: EmbeddingService;
  private llmClient?: Anthropic;

  constructor(config: ContextPlannerConfig) {
    this.config = config;
    this.embeddingService = config.embeddingService;
    this.llmClient = config.llmClient;

    this.weights = {
      systemInstructions: 1.0,
      investigation: 0.95,
      recentTurns: 0.9,
      summaries: 0.8,
      facts: 0.7,
      entityContext: 0.6,
      toolDocs: 0.5,
      ...config.weights,
    };

    this.thresholds = {
      minRelevanceScore: 0.5,
      maxTurnsToConsider: 50,
      maxFactsToInclude: 20,
      maxEntitiesContext: 10,
      recencyDecayFactor: 0.95,
      ...config.thresholds,
    };
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Plan optimal context for an LLM call
   */
  async planContext(params: {
    query: string;
    turns: ConversationTurn[];
    summaries?: Array<{ id: string; content: string; turnRange: [number, number]; timestamp: Date }>;
    facts?: Array<{ id: string; content: string; confidence: number; timestamp: Date }>;
    entities?: OSINTEntity[];
    investigation?: { id: string; name: string; description: string; phase: string };
    systemPrompt: string;
    toolDefinitions?: Array<{ name: string; description: string }>;
    customBudget?: Partial<ContextBudget>;
  }): Promise<PlannedContext> {
    const budget = this.calculateBudget(params.customBudget);
    const sources: ContextSource[] = [];

    // 1. Add system instructions (highest priority)
    const systemSource = this.createSource(
      'system',
      'system',
      params.systemPrompt,
      1.0, // max priority
      1.0, // always relevant
      1.0  // always fresh
    );
    sources.push(systemSource);

    // 2. Add investigation context if present
    if (params.investigation) {
      const investigationContext = this.formatInvestigation(params.investigation);
      sources.push(this.createSource(
        'investigation',
        'investigation',
        investigationContext,
        this.weights.investigation,
        1.0, // always relevant during investigation
        1.0
      ));
    }

    // 3. Score and add conversation turns
    const queryEmbedding = await this.embeddingService.embed(params.query);
    const turnSources = await this.scoreTurns(
      params.turns,
      queryEmbedding.embedding,
      this.thresholds.maxTurnsToConsider
    );
    sources.push(...turnSources);

    // 4. Score and add summaries
    if (params.summaries?.length) {
      const summarySources = await this.scoreSummaries(
        params.summaries,
        queryEmbedding.embedding
      );
      sources.push(...summarySources);
    }

    // 5. Score and add long-term memory facts
    if (params.facts?.length) {
      const factSources = await this.scoreFacts(
        params.facts,
        queryEmbedding.embedding
      );
      sources.push(...factSources);
    }

    // 6. Add entity context
    if (params.entities?.length) {
      const entitySources = this.formatEntities(params.entities);
      sources.push(...entitySources);
    }

    // 7. Add tool documentation
    if (params.toolDefinitions?.length) {
      const toolSource = this.formatTools(params.toolDefinitions);
      sources.push(toolSource);
    }

    // Select sources within budget
    const plan = this.selectSources(sources, budget);

    // Construct final messages
    const messages = this.constructMessages(plan);

    return { messages, plan };
  }

  /**
   * Estimate tokens for a given text
   */
  estimateTokens(text: string): number {
    return encode(text).length;
  }

  /**
   * Compress context if over budget using LLM
   */
  async compressContext(
    context: string,
    targetTokens: number
  ): Promise<string> {
    if (!this.llmClient) {
      // Fallback to truncation
      return this.truncateToTokens(context, targetTokens);
    }

    const currentTokens = this.estimateTokens(context);
    if (currentTokens <= targetTokens) return context;

    const compressionRatio = targetTokens / currentTokens;

    const response = await this.llmClient.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: targetTokens,
      messages: [{
        role: 'user',
        content: `Compress the following context to approximately ${Math.round(compressionRatio * 100)}% of its length while preserving all critical information, entities, relationships, and key facts. Remove redundancy and verbose explanations.

CONTEXT:
${context}

COMPRESSED:`,
      }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    return textBlock?.text || this.truncateToTokens(context, targetTokens);
  }

  // ===========================================================================
  // SCORING
  // ===========================================================================

  private async scoreTurns(
    turns: ConversationTurn[],
    queryEmbedding: number[],
    maxTurns: number
  ): Promise<ContextSource[]> {
    // Take most recent turns for consideration
    const recentTurns = turns.slice(-maxTurns);
    const sources: ContextSource[] = [];

    // Batch embed turn contents
    const turnTexts = recentTurns.map(t => t.content);
    const embeddings = await this.embeddingService.embedBatch(turnTexts);

    for (let i = 0; i < recentTurns.length; i++) {
      const turn = recentTurns[i];
      const embedding = embeddings.embeddings[i].embedding;

      // Calculate relevance score (semantic similarity)
      const relevanceScore = this.embeddingService.cosineSimilarity(
        queryEmbedding,
        embedding
      );

      // Calculate recency score (exponential decay)
      const turnAge = recentTurns.length - i - 1;
      const recencyScore = Math.pow(this.thresholds.recencyDecayFactor, turnAge);

      sources.push(this.createSource(
        `turn-${turn.id}`,
        'turn',
        this.formatTurn(turn),
        this.weights.recentTurns,
        relevanceScore,
        recencyScore,
        { turnIndex: i, role: turn.role }
      ));
    }

    return sources;
  }

  private async scoreSummaries(
    summaries: Array<{ id: string; content: string; turnRange: [number, number]; timestamp: Date }>,
    queryEmbedding: number[]
  ): Promise<ContextSource[]> {
    const sources: ContextSource[] = [];
    const now = Date.now();

    const summaryTexts = summaries.map(s => s.content);
    const embeddings = await this.embeddingService.embedBatch(summaryTexts);

    for (let i = 0; i < summaries.length; i++) {
      const summary = summaries[i];
      const embedding = embeddings.embeddings[i].embedding;

      const relevanceScore = this.embeddingService.cosineSimilarity(
        queryEmbedding,
        embedding
      );

      // Recency based on timestamp
      const ageHours = (now - summary.timestamp.getTime()) / (1000 * 60 * 60);
      const recencyScore = Math.exp(-ageHours / 24); // Decay over 24 hours

      sources.push(this.createSource(
        `summary-${summary.id}`,
        'summary',
        `[Summary of turns ${summary.turnRange[0]}-${summary.turnRange[1]}]\n${summary.content}`,
        this.weights.summaries,
        relevanceScore,
        recencyScore,
        { turnRange: summary.turnRange }
      ));
    }

    return sources;
  }

  private async scoreFacts(
    facts: Array<{ id: string; content: string; confidence: number; timestamp: Date }>,
    queryEmbedding: number[]
  ): Promise<ContextSource[]> {
    const sources: ContextSource[] = [];
    const now = Date.now();

    const factTexts = facts.map(f => f.content);
    const embeddings = await this.embeddingService.embedBatch(factTexts);

    for (let i = 0; i < facts.length; i++) {
      const fact = facts[i];
      const embedding = embeddings.embeddings[i].embedding;

      const relevanceScore = this.embeddingService.cosineSimilarity(
        queryEmbedding,
        embedding
      );

      // Incorporate fact confidence
      const adjustedRelevance = relevanceScore * fact.confidence;

      // Recency based on timestamp
      const ageDays = (now - fact.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.exp(-ageDays / 7); // Decay over 7 days

      sources.push(this.createSource(
        `fact-${fact.id}`,
        'fact',
        fact.content,
        this.weights.facts,
        adjustedRelevance,
        recencyScore,
        { confidence: fact.confidence }
      ));
    }

    return sources;
  }

  // ===========================================================================
  // FORMATTING
  // ===========================================================================

  private formatTurn(turn: ConversationTurn): string {
    const roleLabel = turn.role === 'user' ? 'User' : 'Assistant';
    let formatted = `[${roleLabel}]: ${turn.content}`;

    if (turn.entities?.length) {
      const entityList = turn.entities.map(e => `${e.type}:${e.value}`).join(', ');
      formatted += `\n[Entities: ${entityList}]`;
    }

    return formatted;
  }

  private formatInvestigation(investigation: {
    id: string;
    name: string;
    description: string;
    phase: string;
  }): string {
    return `[Active Investigation]
Name: ${investigation.name}
Phase: ${investigation.phase}
Description: ${investigation.description}`;
  }

  private formatEntities(entities: OSINTEntity[]): ContextSource[] {
    // Group entities by type
    const grouped = new Map<string, OSINTEntity[]>();
    for (const entity of entities) {
      if (!grouped.has(entity.type)) {
        grouped.set(entity.type, []);
      }
      grouped.get(entity.type)!.push(entity);
    }

    const sources: ContextSource[] = [];

    for (const [type, typeEntities] of grouped) {
      const limited = typeEntities
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, this.thresholds.maxEntitiesContext);

      const content = `[${type.toUpperCase()} Entities]\n${
        limited.map(e => `- ${e.value} (confidence: ${(e.confidence * 100).toFixed(0)}%)`).join('\n')
      }`;

      // Average confidence as relevance proxy
      const avgConfidence = limited.reduce((sum, e) => sum + e.confidence, 0) / limited.length;

      sources.push(this.createSource(
        `entities-${type}`,
        'entity',
        content,
        this.weights.entityContext,
        avgConfidence,
        1.0, // Entities are always "fresh"
        { entityType: type, count: limited.length }
      ));
    }

    return sources;
  }

  private formatTools(tools: Array<{ name: string; description: string }>): ContextSource {
    const content = tools.map(t => `- ${t.name}: ${t.description}`).join('\n');

    return this.createSource(
      'tools',
      'tool',
      `[Available Tools]\n${content}`,
      this.weights.toolDocs,
      1.0, // Tools are always relevant
      1.0,
      { toolCount: tools.length }
    );
  }

  // ===========================================================================
  // SOURCE SELECTION
  // ===========================================================================

  private createSource(
    id: string,
    type: ContextSource['type'],
    content: string,
    priority: number,
    relevanceScore: number,
    recencyScore: number,
    metadata?: Record<string, unknown>
  ): ContextSource {
    const tokenCount = this.estimateTokens(content);

    // Combined score: priority * (relevance * recency blend)
    const combinedScore = priority * (0.7 * relevanceScore + 0.3 * recencyScore);

    return {
      id,
      type,
      content,
      tokenCount,
      priority,
      relevanceScore,
      recencyScore,
      combinedScore,
      metadata,
    };
  }

  private selectSources(sources: ContextSource[], budget: ContextBudget): ContextPlan {
    // Sort by combined score (descending)
    const sorted = [...sources].sort((a, b) => b.combinedScore - a.combinedScore);

    const selected: ContextSource[] = [];
    const excluded: Array<{ source: ContextSource; reason: string }> = [];

    const budgetsByType: Record<string, number> = {
      system: budget.system,
      investigation: budget.conversation,
      turn: budget.conversation,
      summary: budget.memory,
      fact: budget.memory,
      entity: budget.entity,
      tool: budget.tools,
    };

    const usedByType: Record<string, number> = {
      system: 0,
      investigation: 0,
      turn: 0,
      summary: 0,
      fact: 0,
      entity: 0,
      tool: 0,
    };

    let totalUsed = 0;

    for (const source of sorted) {
      // Check relevance threshold (except for system and tools)
      if (
        !['system', 'tool', 'investigation'].includes(source.type) &&
        source.relevanceScore < this.thresholds.minRelevanceScore
      ) {
        excluded.push({ source, reason: 'below_relevance_threshold' });
        continue;
      }

      // Check type-specific budget
      const typeBudget = budgetsByType[source.type] || 0;
      if (usedByType[source.type] + source.tokenCount > typeBudget) {
        excluded.push({ source, reason: 'type_budget_exceeded' });
        continue;
      }

      // Check total budget
      if (totalUsed + source.tokenCount > budget.total) {
        excluded.push({ source, reason: 'total_budget_exceeded' });
        continue;
      }

      selected.push(source);
      usedByType[source.type] += source.tokenCount;
      totalUsed += source.tokenCount;
    }

    return {
      sources: selected,
      totalTokens: totalUsed,
      budgetUsed: totalUsed,
      budgetRemaining: budget.total - totalUsed,
      excludedSources: excluded,
      statistics: {
        systemTokens: usedByType.system,
        conversationTokens: usedByType.investigation + usedByType.turn,
        memoryTokens: usedByType.summary + usedByType.fact,
        entityTokens: usedByType.entity,
        toolTokens: usedByType.tool,
      },
    };
  }

  // ===========================================================================
  // MESSAGE CONSTRUCTION
  // ===========================================================================

  private constructMessages(plan: ContextPlan): Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }> {
    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

    // System message with all context
    const systemParts: string[] = [];
    const conversationParts: string[] = [];

    for (const source of plan.sources) {
      switch (source.type) {
        case 'system':
        case 'investigation':
        case 'tool':
        case 'entity':
          systemParts.push(source.content);
          break;

        case 'summary':
          systemParts.push(source.content);
          break;

        case 'fact':
          // Group facts into context section
          break;

        case 'turn':
          conversationParts.push(source.content);
          break;
      }
    }

    // Add facts as a single section
    const facts = plan.sources.filter(s => s.type === 'fact');
    if (facts.length > 0) {
      systemParts.push(`[Relevant Facts from Memory]\n${facts.map(f => `- ${f.content}`).join('\n')}`);
    }

    // System message
    messages.push({
      role: 'system',
      content: systemParts.join('\n\n'),
    });

    // Add conversation history
    // Parse turns back into user/assistant format
    const turns = plan.sources.filter(s => s.type === 'turn');
    for (const turn of turns) {
      const isUser = turn.content.startsWith('[User]');
      const content = turn.content.replace(/^\[(User|Assistant)\]:\s*/, '');

      messages.push({
        role: isUser ? 'user' : 'assistant',
        content,
      });
    }

    return messages;
  }

  // ===========================================================================
  // BUDGET CALCULATION
  // ===========================================================================

  private calculateBudget(custom?: Partial<ContextBudget>): ContextBudget {
    const total = this.config.maxTokenBudget - this.config.minReservedForResponse;

    // Default allocation percentages
    const defaultBudget: ContextBudget = {
      total,
      system: Math.floor(total * 0.15),       // 15% for system
      conversation: Math.floor(total * 0.45), // 45% for conversation
      memory: Math.floor(total * 0.25),       // 25% for memory
      entity: Math.floor(total * 0.10),       // 10% for entities
      tools: Math.floor(total * 0.05),        // 5% for tools
    };

    if (!custom) return defaultBudget;

    return {
      total: custom.total ?? defaultBudget.total,
      system: custom.system ?? defaultBudget.system,
      conversation: custom.conversation ?? defaultBudget.conversation,
      memory: custom.memory ?? defaultBudget.memory,
      entity: custom.entity ?? defaultBudget.entity,
      tools: custom.tools ?? defaultBudget.tools,
    };
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  private truncateToTokens(text: string, maxTokens: number): string {
    const tokens = encode(text);
    if (tokens.length <= maxTokens) return text;

    // Truncate by finding the character boundary
    let charCount = 0;
    let tokenCount = 0;

    for (const char of text) {
      const charTokens = encode(char).length;
      if (tokenCount + charTokens > maxTokens) break;
      tokenCount += charTokens;
      charCount++;
    }

    return text.slice(0, charCount) + '...';
  }
}

// =============================================================================
// ADAPTIVE CONTEXT STRATEGIES
// =============================================================================

export class AdaptiveContextStrategy {
  /**
   * Strategy for investigation-focused contexts
   * Prioritizes investigation context and entity relationships
   */
  static investigation(): Partial<ContextWeights> {
    return {
      investigation: 1.0,
      entityContext: 0.9,
      facts: 0.8,
      recentTurns: 0.7,
      summaries: 0.6,
    };
  }

  /**
   * Strategy for Q&A focused contexts
   * Prioritizes recent conversation and relevant facts
   */
  static questionAnswering(): Partial<ContextWeights> {
    return {
      recentTurns: 1.0,
      facts: 0.9,
      summaries: 0.8,
      entityContext: 0.6,
    };
  }

  /**
   * Strategy for entity exploration
   * Prioritizes entity context and knowledge graph facts
   */
  static entityExploration(): Partial<ContextWeights> {
    return {
      entityContext: 1.0,
      facts: 0.95,
      investigation: 0.8,
      recentTurns: 0.6,
    };
  }

  /**
   * Strategy for threat analysis
   * Prioritizes MITRE/TTP facts and threat actor entities
   */
  static threatAnalysis(): Partial<ContextWeights> {
    return {
      facts: 1.0,
      entityContext: 0.95,
      investigation: 0.9,
      summaries: 0.7,
    };
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createContextPlanner(config: ContextPlannerConfig): ContextPlanner {
  return new ContextPlanner(config);
}
