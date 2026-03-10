/**
 * Token Attribution Graph (TAG) Builder
 *
 * Implements fine-grained token-level provenance tracking for LLM outputs.
 * Maps each token range in output to source context fragments with
 * confidence scores and cryptographic binding.
 *
 * Enables GDPR/CCPA compliance (deletion queries), explainability,
 * and hallucination detection.
 *
 * ⚠️ IMPLEMENTATION STATUS: BASIC VERSION (P1-1 from audit report)
 * - ✅ In-memory attribution storage
 * - ✅ Simple token-level tracking (word-based approximation)
 * - ✅ Deletion query support (GDPR/CCPA)
 * - ⚠️ MISSING: Real-time streaming attribution marker detection
 * - ⚠️ MISSING: LLM attention weight integration
 * - ⚠️ MISSING: PostgreSQL persistence
 * - ⚠️ MISSING: Tokenizer integration (using naive word splitting)
 *
 * Patent Defensive Publication: 2026-01-01
 * Related: ADR-0025
 *
 * @module conductor/attribution/tag-builder
 */

import crypto from 'crypto';
import logger from '../../utils/logger.js';

/**
 * Source context with sensitivity labels
 */
export interface AttributedSource {
  /** Unique source identifier */
  sourceId: string;

  /** Source type */
  type: 'database' | 'api' | 'user_input' | 'model_output' | 'file';

  /** Source URI (e.g., "postgres://crm/customers/12345") */
  uri: string;

  /** Cryptographic hash of source content (SHA-256) */
  contentHash: string;

  /** Sensitivity labels */
  sensitivity: {
    /** Contains personally identifiable information (PII) */
    pii: boolean;

    /** Contains intellectual property */
    ip: boolean;

    /** Confidentiality classification */
    confidential: boolean;

    /** Publicly releasable */
    public: boolean;
  };
}

/**
 * Token range attribution node in graph
 */
export interface AttributionNode {
  /** Source that contributed to this token range */
  sourceId: string;

  /** Token span [start, end) (exclusive end) */
  tokenSpan: [number, number];

  /** Confidence that these tokens came from this source [0, 1] */
  confidence: number;

  /** Transformation type */
  transformation: 'copy' | 'paraphrase' | 'synthesize';

  /** Attention weight sum (from LLM attention mechanism) */
  attentionWeightSum?: number;
}

/**
 * Complete attribution graph for an output
 */
export interface AttributionGraph {
  /** Output identifier */
  outputId: string;

  /** Full output text */
  outputText: string;

  /** Token count */
  tokenCount: number;

  /** Attribution nodes (source → token range mappings) */
  nodes: AttributionNode[];

  /** Sources referenced */
  sources: Record<string, AttributedSource>;

  /** Timestamp when graph was built */
  createdAt: Date;
}

/**
 * Deletion query result (GDPR/CCPA compliance)
 */
export interface DeletionQueryResult {
  /** Outputs containing data from deleted source */
  affectedOutputs: Array<{
    outputId: string;
    tokenRanges: Array<[number, number]>;
    redactedText: string; // Output with PII tokens replaced with "[REDACTED]"
  }>;

  /** Total number of affected outputs */
  totalCount: number;
}

/**
 * Token Attribution Graph Builder
 */
export class TokenAttributionGraphBuilder {
  constructor() {
    logger.info('[AI Attribution] TokenAttributionGraphBuilder initialized with PostgreSQL persistence.');
  }

  /**
   * Build attribution graph during LLM generation.
   *
   * Algorithm:
   * 1. Insert attribution markers into context every N tokens
   * 2. Use streaming API to capture partial generations with markers
   * 3. Extract markers, map token ranges to sources
   * 4. Compute confidence scores from attention weights (if available)
   * 5. Store graph in database
   *
   * Attribution marker format: `<|attr:source_id|>` (invisible to user)
   *
   * @param outputId Unique identifier for this output
   * @param contextSources List of sources used in context
   * @param generationStream Streaming LLM response
   * @returns Attribution graph
   */
  async buildFromGenerationStream(
    outputId: string,
    contextSources: AttributedSource[],
    generationStream: AsyncIterable<string>
  ): Promise<AttributionGraph> {
    const nodes: AttributionNode[] = [];
    let outputText = '';
    let currentTokenIndex = 0;
    let currentSourceId: string | null = null;
    let rangeStart = 0;

    // Process streaming response
    for await (const chunk of generationStream) {
      outputText += chunk;

      // Simplified: Detect attribution markers in stream
      const markerRegex = /<\|attr:([^|]+)\|>/g;
      let match;

      while ((match = markerRegex.exec(chunk)) !== null) {
        const newSourceId = match[1];

        // Close previous attribution range
        if (currentSourceId) {
          nodes.push({
            sourceId: currentSourceId,
            tokenSpan: [rangeStart, currentTokenIndex],
            confidence: 0.75, // Simplified: fixed confidence (no attention weights)
            transformation: 'paraphrase', // Simplified: assume paraphrase
          });
        }

        // Start new attribution range
        currentSourceId = newSourceId;
        rangeStart = currentTokenIndex;
      }

      // Simplified token counting: approximate by words (TODO: use tiktoken)
      const wordCount = chunk.split(/\s+/).filter(w => w.length > 0).length;
      currentTokenIndex += wordCount;
    }

    // Close final attribution range
    if (currentSourceId) {
      nodes.push({
        sourceId: currentSourceId,
        tokenSpan: [rangeStart, currentTokenIndex],
        confidence: 0.75,
        transformation: 'paraphrase',
      });
    }

    // If no explicit attributions found, attribute entire output to all sources with low confidence
    if (nodes.length === 0 && contextSources.length > 0) {
      console.warn(`[AI Attribution] No attribution markers found for output ${outputId}. Attributing to all sources with low confidence.`);
      contextSources.forEach((source) => {
        nodes.push({
          sourceId: source.sourceId,
          tokenSpan: [0, currentTokenIndex],
          confidence: 0.3, // Low confidence for implicit attribution
          transformation: 'synthesize',
        });
      });
    }

    const graph: AttributionGraph = {
      outputId,
      outputText,
      tokenCount: currentTokenIndex,
      nodes,
      sources: Object.fromEntries(contextSources.map(s => [s.sourceId, s])),
      createdAt: new Date(),
    };

    // Store in PostgreSQL
    try {
      const { getPostgresPool } = await import('../../db/postgres.js');
      const pg = getPostgresPool();

      await pg.query(
        `INSERT INTO maestro.attribution_graphs (output_id, output_text, token_count, nodes, sources, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (output_id) DO UPDATE SET
           output_text = EXCLUDED.output_text,
           token_count = EXCLUDED.token_count,
           nodes = EXCLUDED.nodes,
           sources = EXCLUDED.sources,
           created_at = EXCLUDED.created_at`,
        [graph.outputId, graph.outputText, graph.tokenCount, JSON.stringify(graph.nodes), JSON.stringify(graph.sources), graph.createdAt]
      );

      logger.info({ outputId: graph.outputId }, '[AI Attribution] Persisted attribution graph to PostgreSQL');
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error), outputId }, '[AI Attribution] Failed to persist attribution graph');
    }

    return graph;
  }

  /**
   * Query which outputs contain data from a specific source.
   *
   * Use case: GDPR deletion - user requests "delete my data"
   *
   * Algorithm:
   * 1. Query attribution_graphs table for all outputs with source_id
   * 2. For each output, identify token ranges from that source
   * 3. Generate redacted version (replace tokens with "[REDACTED]")
   * 4. Return list of affected outputs with redaction instructions
   *
   * @param sourceId Source to search for (e.g., database record hash)
   * @returns Deletion query result with affected outputs
   */
  async queryBySource(sourceId: string): Promise<DeletionQueryResult> {
    try {
      const { getPostgresPool } = await import('../../db/postgres.js');
      const pg = getPostgresPool();

      // Use SQL jsonb search for efficient lookup
      // Find rows where 'nodes' array contains an object with sourceId matching the parameter
      const { rows } = await pg.query(
        `SELECT output_id, output_text, nodes FROM maestro.attribution_graphs
         WHERE nodes @> $1::jsonb`,
        [JSON.stringify([{ sourceId }])]
      );

      const affectedOutputs: DeletionQueryResult['affectedOutputs'] = rows.map((row: any) => {
        const nodes: AttributionNode[] = row.nodes;
        const relevantNodes = nodes.filter(node => node.sourceId === sourceId);
        const tokenRanges = relevantNodes.map(node => node.tokenSpan);
        const redactedText = this.redactTokenRanges(row.output_text, tokenRanges);

        return {
          outputId: row.output_id,
          tokenRanges,
          redactedText,
        };
      });

      logger.info({ sourceId, count: affectedOutputs.length }, '[AI Attribution] Queried outputs by source attribution');

      return {
        affectedOutputs,
        totalCount: affectedOutputs.length,
      };
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error), sourceId }, '[AI Attribution] Failed to query by source');
      return { affectedOutputs: [], totalCount: 0 };
    }
  }

  /**
   * Query attribution for a specific output.
   *
   * Use case: Explainability - "Why did AI make this decision?"
   *
   * Returns: "This diagnosis came 80% from patient EHR, 20% from medical literature"
   *
   * @param outputId Output identifier
   * @returns Attribution graph showing source breakdown
   */
  async queryByOutput(outputId: string): Promise<AttributionGraph | null> {
    try {
      const { getPostgresPool } = await import('../../db/postgres.js');
      const pg = getPostgresPool();

      const { rows } = await pg.query(
        `SELECT output_id as "outputId", output_text as "outputText", token_count as "tokenCount", 
                nodes, sources, created_at as "createdAt"
         FROM maestro.attribution_graphs
         WHERE output_id = $1`,
        [outputId]
      );

      if (rows.length === 0) {
        logger.warn({ outputId }, '[AI Attribution] No attribution graph found in database');
        return null;
      }

      return rows[0] as AttributionGraph;
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error), outputId }, '[AI Attribution] Failed to query by output');
      return null;
    }
  }

  /**
   * Find tokens without source attribution (potential hallucinations).
   *
   * Tokens with no source grounding are either:
   * - Hallucinations (model made up facts)
   * - Synthesis (valid reasoning from multiple sources)
   *
   * This method identifies gaps in attribution for manual review.
   *
   * @param outputId Output identifier
   * @returns Token ranges with no source attribution
   */
  async findUngroundedTokens(outputId: string): Promise<Array<[number, number]>> {
    const graph = await this.queryByOutput(outputId);
    if (!graph) return [];

    // Find gaps in attribution coverage (potential hallucinations)
    const coveredRanges = graph.nodes.map(n => n.tokenSpan);
    const gaps = this.findGapsInRanges(coveredRanges, graph.tokenCount);

    if (gaps.length > 0) {
      console.warn(`[AI Attribution] Found ${gaps.length} ungrounded token ranges in output ${outputId} (potential hallucinations)`);
    }

    return gaps;
  }

  /**
   * Helper: Find gaps in coverage ranges
   */
  private findGapsInRanges(ranges: Array<[number, number]>, totalLength: number): Array<[number, number]> {
    if (ranges.length === 0) {
      return totalLength > 0 ? [[0, totalLength]] : [];
    }

    // Sort ranges by start position
    const sorted = [...ranges].sort((a, b) => a[0] - b[0]);

    const gaps: Array<[number, number]> = [];

    // Check gap before first range
    if (sorted[0][0] > 0) {
      gaps.push([0, sorted[0][0]]);
    }

    // Check gaps between ranges
    for (let i = 0; i < sorted.length - 1; i++) {
      const currentEnd = sorted[i][1];
      const nextStart = sorted[i + 1][0];

      if (nextStart > currentEnd) {
        gaps.push([currentEnd, nextStart]);
      }
    }

    // Check gap after last range
    const lastEnd = sorted[sorted.length - 1][1];
    if (lastEnd < totalLength) {
      gaps.push([lastEnd, totalLength]);
    }

    return gaps;
  }

  /**
   * Propagate sensitivity labels from sources to output tokens.
   *
   * Use case: Policy enforcement - "Don't store outputs containing PII"
   *
   * Algorithm:
   * 1. For each attribution node, check source sensitivity
   * 2. If source has PII=true, mark token range as PII
   * 3. Aggregate: output is PII if ANY token is PII
   *
   * @param outputId Output identifier
   * @returns Sensitivity labels for output
   */
  async propagateSensitivity(outputId: string): Promise<AttributedSource['sensitivity']> {
    const graph = await this.queryByOutput(outputId);
    if (!graph) {
      return { pii: false, ip: false, confidential: false, public: true };
    }

    // Default: no sensitivity
    const aggregated: AttributedSource['sensitivity'] = {
      pii: false,
      ip: false,
      confidential: false,
      public: true,
    };

    // Aggregate: output inherits maximum sensitivity from any source
    for (const node of graph.nodes) {
      const source = graph.sources[node.sourceId];
      if (!source) continue;

      aggregated.pii = aggregated.pii || source.sensitivity.pii;
      aggregated.ip = aggregated.ip || source.sensitivity.ip;
      aggregated.confidential = aggregated.confidential || source.sensitivity.confidential;
      aggregated.public = aggregated.public && source.sensitivity.public;
    }

    return aggregated;
  }

  /**
   * Redact token ranges from text (for deletion compliance).
   *
   * @param text Full text
   * @param tokenRanges Ranges to redact
   * @returns Text with redacted ranges replaced with "[REDACTED]"
   */
  private redactTokenRanges(text: string, tokenRanges: Array<[number, number]>): string {
    // Simplified: Use word-level redaction (TODO: replace with proper tokenizer)
    const words = text.split(/\s+/);

    // Create a set of word indices to redact
    const redactIndices = new Set<number>();
    for (const [start, end] of tokenRanges) {
      for (let i = start; i < Math.min(end, words.length); i++) {
        redactIndices.add(i);
      }
    }

    // Redact marked words
    const redactedWords = words.map((word, idx) =>
      redactIndices.has(idx) ? '[REDACTED]' : word
    );

    return redactedWords.join(' ');
  }
}

/**
 * Example usage:
 *
 * ```typescript
 * const builder = new TokenAttributionGraphBuilder();
 *
 * // Build graph during LLM generation
 * const sources: AttributedSource[] = [
 *   {
 *     sourceId: 'db-customer-12345',
 *     type: 'database',
 *     uri: 'postgres://crm/customers/12345',
 *     contentHash: 'sha256:abc...',
 *     sensitivity: { pii: true, ip: false, confidential: true, public: false }
 *   }
 * ];
 *
 * const graph = await builder.buildFromGenerationStream(
 *   'output-uuid',
 *   sources,
 *   llmClient.generateStream(prompt)
 * );
 *
 * // GDPR deletion query
 * const deletionResult = await builder.queryBySource('db-customer-12345');
 * console.log(`${deletionResult.totalCount} outputs contain this customer's data`);
 *
 * for (const output of deletionResult.affectedOutputs) {
 *   console.log(`Output ${output.outputId}: ${output.redactedText}`);
 * }
 *
 * // Explainability query
 * const outputGraph = await builder.queryByOutput('output-uuid');
 * const sourceBreakdown = new Map<string, number>();
 *
 * for (const node of outputGraph.nodes) {
 *   const tokenCount = node.tokenSpan[1] - node.tokenSpan[0];
 *   sourceBreakdown.set(
 *     node.sourceId,
 *     (sourceBreakdown.get(node.sourceId) || 0) + tokenCount
 *   );
 * }
 *
 * console.log('Source breakdown:');
 * for (const [sourceId, tokenCount] of sourceBreakdown) {
 *   const percentage = (tokenCount / outputGraph.tokenCount) * 100;
 *   console.log(`  ${sourceId}: ${percentage.toFixed(1)}%`);
 * }
 * ```
 */
