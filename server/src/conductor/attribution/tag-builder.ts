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
 * Patent Defensive Publication: 2026-01-01
 * Related: ADR-0025
 *
 * @module conductor/attribution/tag-builder
 */

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
  constructor(
    // TODO: Inject LLM client with streaming API access
    // TODO: Inject PostgreSQL client for attribution_graphs table
    // TODO: Inject tokenizer (e.g., tiktoken for GPT models)
  ) {}

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

      // TODO: Detect attribution markers in stream
      // const markerRegex = /<\|attr:([^|]+)\|>/g;
      // let match;
      //
      // while ((match = markerRegex.exec(chunk)) !== null) {
      //   const newSourceId = match[1];
      //
      //   // Close previous attribution range
      //   if (currentSourceId) {
      //     nodes.push({
      //       sourceId: currentSourceId,
      //       tokenSpan: [rangeStart, currentTokenIndex],
      //       confidence: 0.85, // TODO: Compute from attention weights
      //       transformation: 'paraphrase' // TODO: Infer from similarity
      //     });
      //   }
      //
      //   // Start new attribution range
      //   currentSourceId = newSourceId;
      //   rangeStart = currentTokenIndex;
      // }

      // TODO: Count tokens in chunk
      // const tokens = this.tokenizer.encode(chunk);
      // currentTokenIndex += tokens.length;
    }

    // Close final attribution range
    if (currentSourceId) {
      nodes.push({
        sourceId: currentSourceId,
        tokenSpan: [rangeStart, currentTokenIndex],
        confidence: 0.85,
        transformation: 'paraphrase',
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

    // TODO: Store in database
    // await this.storeGraph(graph);

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
    // TODO: Query database
    // const results = await this.db.query(`
    //   SELECT output_id, token_start, token_end, output_text
    //   FROM attribution_graphs
    //   WHERE source_id = $1
    // `, [sourceId]);

    const affectedOutputs: DeletionQueryResult['affectedOutputs'] = [];

    // TODO: For each output, generate redacted version
    // for (const row of results.rows) {
    //   const tokenRanges: Array<[number, number]> = [[row.token_start, row.token_end]];
    //   const redactedText = this.redactTokenRanges(row.output_text, tokenRanges);
    //
    //   affectedOutputs.push({
    //     outputId: row.output_id,
    //     tokenRanges,
    //     redactedText
    //   });
    // }

    return {
      affectedOutputs,
      totalCount: affectedOutputs.length,
    };
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
    // TODO: Query database
    // const graph = await this.db.query(`
    //   SELECT * FROM attribution_graphs WHERE output_id = $1
    // `, [outputId]);

    // if (!graph.rows.length) return null;

    // TODO: Reconstruct graph from database rows
    return null; // TODO: Implement
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

    // TODO: Find gaps in attribution coverage
    // const coveredRanges = graph.nodes.map(n => n.tokenSpan);
    // const gaps = this.findGapsInRanges(coveredRanges, graph.tokenCount);

    return []; // TODO: Implement
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
    // TODO: Tokenize, replace ranges, detokenize
    // const tokens = this.tokenizer.encode(text);
    //
    // for (const [start, end] of tokenRanges) {
    //   for (let i = start; i < end; i++) {
    //     tokens[i] = this.tokenizer.encode('[REDACTED]')[0];
    //   }
    // }
    //
    // return this.tokenizer.decode(tokens);

    return text; // TODO: Implement
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
