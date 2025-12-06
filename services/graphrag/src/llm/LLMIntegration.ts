/**
 * LLM Integration Layer
 * Abstraction for LLM providers with cost tracking and fallbacks
 */

import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { EvidenceChunk, CitationSource, RAGAnswer } from '../types/index.js';

const tracer = trace.getTracer('graphrag-llm');

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'azure';
  model: string;
  embeddingModel: string;
  apiKey: string;
  baseUrl?: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  costPerInputToken: number;
  costPerOutputToken: number;
}

export interface LLMResponse {
  content: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;
  modelUsed: string;
  finishReason: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  tokensUsed: number;
  cost: number;
}

export class LLMIntegration {
  private openai: OpenAI;
  private config: LLMConfig;
  private totalCost = 0;

  constructor(config: LLMConfig) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  /**
   * Generate answer with citations from evidence
   */
  async generateAnswer(
    query: string,
    evidenceChunks: EvidenceChunk[],
    options: {
      maxTokens?: number;
      temperature?: number;
      includeReasoning?: boolean;
    } = {},
  ): Promise<RAGAnswer> {
    return tracer.startActiveSpan('llm_generate_answer', async (span) => {
      const startTime = Date.now();

      try {
        span.setAttribute('query.length', query.length);
        span.setAttribute('evidence.count', evidenceChunks.length);

        // Build context from evidence
        const context = this.buildContext(evidenceChunks);
        span.setAttribute('context.length', context.length);

        // Build system prompt
        const systemPrompt = this.buildSystemPrompt(options.includeReasoning);

        // Build user prompt
        const userPrompt = this.buildUserPrompt(query, context);

        // Call LLM
        const response = await this.complete(systemPrompt, userPrompt, {
          maxTokens: options.maxTokens || this.config.maxTokens,
          temperature: options.temperature || this.config.temperature,
        });

        // Parse citations from response
        const { answer, usedCitations, reasoning } = this.parseResponse(
          response.content,
          evidenceChunks,
        );

        const ragAnswer: RAGAnswer = {
          id: uuidv4(),
          query,
          answer,
          citations: usedCitations.map((c, i) => ({
            index: i + 1,
            source: c,
            usedInAnswer: true,
          })),
          graphEvidence: evidenceChunks
            .flatMap((e) => e.graphPaths)
            .slice(0, 5)
            .map((path) => ({
              path,
              explanation: `Path connecting ${path.nodes[0]?.label} to ${path.nodes[path.nodes.length - 1]?.label}`,
            })),
          confidence: this.calculateConfidence(evidenceChunks, usedCitations),
          reasoning,
          tokensUsed: response.tokensUsed,
          modelUsed: response.modelUsed,
          processingTimeMs: Date.now() - startTime,
          tenantId: evidenceChunks[0]?.tenantId || 'unknown',
          createdAt: new Date().toISOString(),
        };

        span.setAttribute('answer.length', answer.length);
        span.setAttribute('citations.count', usedCitations.length);
        span.setAttribute('tokens.total', response.tokensUsed.total);
        span.setStatus({ code: SpanStatusCode.OK });

        return ragAnswer;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Generate embeddings for text
   */
  async embed(text: string): Promise<EmbeddingResponse> {
    return tracer.startActiveSpan('llm_embed', async (span) => {
      try {
        span.setAttribute('text.length', text.length);

        const response = await this.openai.embeddings.create({
          model: this.config.embeddingModel,
          input: text.slice(0, 8000),
        });

        const embedding = response.data[0].embedding;
        const tokensUsed = response.usage.total_tokens;
        const cost = tokensUsed * this.config.costPerInputToken;

        this.totalCost += cost;

        span.setAttribute('embedding.dimensions', embedding.length);
        span.setAttribute('tokens.used', tokensUsed);
        span.setStatus({ code: SpanStatusCode.OK });

        return { embedding, tokensUsed, cost };
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Generate Cypher query from natural language
   */
  async generateCypher(
    naturalLanguage: string,
    schema: {
      nodeTypes: string[];
      relationshipTypes: string[];
      properties: Record<string, string[]>;
    },
  ): Promise<{
    cypher: string;
    explanation: string;
    confidence: number;
    warnings: string[];
  }> {
    return tracer.startActiveSpan('llm_generate_cypher', async (span) => {
      try {
        span.setAttribute('query.length', naturalLanguage.length);

        const systemPrompt = `You are an expert in converting natural language to Cypher queries for Neo4j.

Schema:
- Node types: ${schema.nodeTypes.join(', ')}
- Relationship types: ${schema.relationshipTypes.join(', ')}
- Properties: ${JSON.stringify(schema.properties)}

Rules:
1. Generate safe, read-only Cypher queries (no mutations)
2. Always include tenant isolation with WHERE tenantId = $tenantId
3. Use appropriate LIMIT clauses (max 1000)
4. Include OPTIONAL MATCH for optional relationships

Respond with JSON:
{
  "cypher": "MATCH ... RETURN ...",
  "explanation": "This query finds...",
  "confidence": 0.8,
  "warnings": ["..."]
}`;

        const response = await this.complete(systemPrompt, naturalLanguage, {
          maxTokens: 500,
          temperature: 0.1,
        });

        try {
          const result = JSON.parse(response.content);

          // Validate query safety
          const warnings = [...(result.warnings || [])];
          const dangerousKeywords = ['DELETE', 'REMOVE', 'SET', 'CREATE', 'MERGE', 'DROP'];

          for (const keyword of dangerousKeywords) {
            if (result.cypher.toUpperCase().includes(keyword)) {
              warnings.push(`Query contains potentially dangerous keyword: ${keyword}`);
              result.confidence = Math.min(result.confidence, 0.3);
            }
          }

          span.setStatus({ code: SpanStatusCode.OK });
          return {
            cypher: result.cypher,
            explanation: result.explanation,
            confidence: result.confidence,
            warnings,
          };
        } catch {
          // Fallback parsing
          return {
            cypher: response.content,
            explanation: 'Generated query',
            confidence: 0.4,
            warnings: ['Could not parse structured response'],
          };
        }
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Generate hypotheses based on evidence
   */
  async generateHypotheses(
    evidenceChunks: EvidenceChunk[],
    context: string,
  ): Promise<
    Array<{
      hypothesis: string;
      confidence: number;
      supportingEvidence: string[];
      contradictingEvidence: string[];
    }>
  > {
    const systemPrompt = `You are an intelligence analyst generating hypotheses from evidence.

Given the evidence, generate 3-5 hypotheses that could explain the observations.
For each hypothesis:
1. State the hypothesis clearly
2. Rate your confidence (0-1)
3. List supporting evidence
4. List contradicting evidence

Respond with JSON array.`;

    const userPrompt = `Context: ${context}

Evidence:
${evidenceChunks.map((e, i) => `[${i + 1}] ${e.content.slice(0, 500)}`).join('\n\n')}

Generate hypotheses:`;

    const response = await this.complete(systemPrompt, userPrompt, {
      maxTokens: 1000,
      temperature: 0.7,
    });

    try {
      return JSON.parse(response.content);
    } catch {
      return [
        {
          hypothesis: 'Unable to generate structured hypotheses',
          confidence: 0,
          supportingEvidence: [],
          contradictingEvidence: [],
        },
      ];
    }
  }

  /**
   * Summarize multiple evidence chunks
   */
  async summarize(
    chunks: EvidenceChunk[],
    maxLength: number = 500,
  ): Promise<string> {
    const systemPrompt = `Summarize the following evidence concisely.
Preserve key facts and relationships. Include citation markers [1], [2], etc.
Maximum ${maxLength} characters.`;

    const content = chunks
      .map((c, i) => `[${i + 1}] ${c.content.slice(0, 1000)}`)
      .join('\n\n');

    const response = await this.complete(systemPrompt, content, {
      maxTokens: maxLength / 3,
      temperature: 0.3,
    });

    return response.content;
  }

  /**
   * Core completion method
   */
  private async complete(
    systemPrompt: string,
    userPrompt: string,
    options: { maxTokens: number; temperature: number },
  ): Promise<LLMResponse> {
    const response = await this.openai.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      top_p: this.config.topP,
    });

    const tokensUsed = {
      prompt: response.usage?.prompt_tokens || 0,
      completion: response.usage?.completion_tokens || 0,
      total: response.usage?.total_tokens || 0,
    };

    const cost =
      tokensUsed.prompt * this.config.costPerInputToken +
      tokensUsed.completion * this.config.costPerOutputToken;

    this.totalCost += cost;

    return {
      content: response.choices[0]?.message?.content || '',
      tokensUsed,
      cost,
      modelUsed: this.config.model,
      finishReason: response.choices[0]?.finish_reason || 'unknown',
    };
  }

  /**
   * Build context from evidence chunks
   */
  private buildContext(chunks: EvidenceChunk[]): string {
    return chunks
      .slice(0, 10)
      .map((chunk, i) => {
        const citations = chunk.citations
          .map((c) => c.documentTitle || c.documentId)
          .join(', ');
        return `[${i + 1}] (Sources: ${citations})\n${chunk.content.slice(0, 800)}`;
      })
      .join('\n\n');
  }

  /**
   * Build system prompt for answer generation
   */
  private buildSystemPrompt(includeReasoning?: boolean): string {
    let prompt = `You are an intelligent analyst for IntelGraph, a graph-based intelligence analysis platform.

Answer questions based on the provided evidence. Follow these rules:
1. Always cite your sources using [number] format
2. Be precise and factual
3. Acknowledge uncertainty when information is incomplete
4. Never fabricate information not in the evidence`;

    if (includeReasoning) {
      prompt += `
5. Explain your reasoning step by step before providing the final answer
6. Format: First show <reasoning>...</reasoning>, then the answer`;
    }

    return prompt;
  }

  /**
   * Build user prompt
   */
  private buildUserPrompt(query: string, context: string): string {
    return `Evidence:
${context}

Question: ${query}

Please provide a comprehensive answer based on the evidence above. Include citations [1], [2], etc. for specific facts.`;
  }

  /**
   * Parse response to extract answer and citations
   */
  private parseResponse(
    content: string,
    evidenceChunks: EvidenceChunk[],
  ): {
    answer: string;
    usedCitations: CitationSource[];
    reasoning?: string;
  } {
    // Extract reasoning if present
    let reasoning: string | undefined;
    let answer = content;

    const reasoningMatch = content.match(/<reasoning>([\s\S]*?)<\/reasoning>/);
    if (reasoningMatch) {
      reasoning = reasoningMatch[1].trim();
      answer = content.replace(/<reasoning>[\s\S]*?<\/reasoning>/, '').trim();
    }

    // Extract citation markers
    const citationMarkers = answer.match(/\[(\d+)\]/g) || [];
    const usedIndices = new Set(
      citationMarkers.map((m) => parseInt(m.replace(/[\[\]]/g, ''), 10)),
    );

    // Map to actual citations
    const usedCitations: CitationSource[] = [];
    for (const index of usedIndices) {
      const chunk = evidenceChunks[index - 1];
      if (chunk) {
        usedCitations.push(...chunk.citations);
      }
    }

    return { answer, usedCitations, reasoning };
  }

  /**
   * Calculate confidence based on evidence and citations
   */
  private calculateConfidence(
    evidenceChunks: EvidenceChunk[],
    usedCitations: CitationSource[],
  ): number {
    if (evidenceChunks.length === 0) return 0;

    // Average relevance of evidence
    const avgRelevance =
      evidenceChunks.reduce((sum, c) => sum + c.relevanceScore, 0) /
      evidenceChunks.length;

    // Average confidence of citations
    const avgCitationConfidence =
      usedCitations.length > 0
        ? usedCitations.reduce((sum, c) => sum + c.confidence, 0) /
          usedCitations.length
        : 0.5;

    // Citation coverage
    const citationCoverage = Math.min(usedCitations.length / 3, 1);

    // Weighted combination
    return 0.4 * avgRelevance + 0.4 * avgCitationConfidence + 0.2 * citationCoverage;
  }

  /**
   * Get total cost incurred
   */
  getTotalCost(): number {
    return this.totalCost;
  }

  /**
   * Reset cost tracking
   */
  resetCostTracking(): void {
    this.totalCost = 0;
  }
}
