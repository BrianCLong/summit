import { z } from 'zod';
import { DeterministicEmbedder } from './embedder.js';
import { CitationBuilder } from './citationBuilder.js';
import { DefaultHybridRetriever } from './hybridRetriever.js';
import { ToolRouter } from './tooling.js';
import type {
  Citation,
  GraphStore,
  Metadata,
  PlannerStep,
  RAGResponse,
  RetrievedChunk,
  VectorStore,
} from './types.js';
import { withSpan, newRunId, traceId, logEvent } from '../observability/instrumentation.js';

const requestSchema = z.object({
  query: z.string(),
  workspaceId: z.string().optional(),
  filters: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
  corpusVersion: z.string().optional(),
  topK: z.number().int().positive().default(8),
  useHyde: z.boolean().default(false),
  useTools: z.boolean().default(true),
});

export interface RAGOrchestratorDependencies {
  vectorStore: VectorStore;
  graphStore?: GraphStore;
  embedder?: DeterministicEmbedder;
}

export class RAGOrchestrator {
  private readonly vectorStore: VectorStore;
  private readonly graphStore?: GraphStore;
  private readonly embedder: DeterministicEmbedder;
  private readonly citationBuilder: CitationBuilder;
  private readonly toolRouter: ToolRouter;
  private readonly weights?: { vector: number; graph: number };

  constructor(
    deps: RAGOrchestratorDependencies,
    options: { enableHttpFetch?: boolean; weights?: { vector: number; graph: number } } = {}
  ) {
    this.vectorStore = deps.vectorStore;
    this.graphStore = deps.graphStore;
    this.embedder = deps.embedder ?? new DeterministicEmbedder();
    this.citationBuilder = new CitationBuilder();
    this.toolRouter = new ToolRouter({ enableHttpFetch: options.enableHttpFetch });
    this.weights = options.weights;
  }

  async answer(input: unknown): Promise<RAGResponse> {
    const parsed = requestSchema.parse(input);
    const runId = newRunId();
    const activeTraceId = traceId();
    logEvent('agentic_rag_start', {
      runId,
      traceId: activeTraceId,
      workspaceId: parsed.workspaceId,
      useHyde: parsed.useHyde,
      useTools: parsed.useTools,
      topK: parsed.topK,
    });
    const planner = await this.plan(parsed.query, parsed.workspaceId, parsed.filters as Metadata);
    const normalizedQuery = await withSpan('rewrite', async () => planner.rewrittenQuery);

    const embedding = await withSpan('compute_embedding', () => this.embedder.embed(normalizedQuery));
    const hydeEmbedding = parsed.useHyde
      ? await withSpan('hyde', () => this.embedder.embed(`hypothetical ${normalizedQuery}`))
      : undefined;

    const finalEmbedding = hydeEmbedding ?? embedding;
    const retriever = new DefaultHybridRetriever({
      vectorStore: this.vectorStore,
      graphStore: this.graphStore,
      weights: this.weights,
    });

    const retrieved = await withSpan('retrieve', () =>
      retriever.retrieve(finalEmbedding, {
        topK: parsed.topK,
        workspaceId: parsed.workspaceId,
        corpusVersion: parsed.corpusVersion,
        filters: parsed.filters as Metadata,
      })
    );

    const toolResults: RetrievedChunk[] = parsed.useTools
      ? await this.applyTools(retrieved, parsed.query)
      : retrieved;

    const citations = this.citationBuilder.build(toolResults);
    const answer = await withSpan('synthesize', async () => this.synthesize(toolResults, parsed.query));
    const selfCheck = await withSpan('self_check', async () =>
      this.selfCheck(answer, citations)
    );

    const response = {
      answer,
      citations,
      debug: {
        runId,
        traceId: activeTraceId,
        plan: planner.plan,
        normalizedQuery,
        retrievedCount: retrieved.length,
        corpusVersion: parsed.corpusVersion,
        selfCheck,
      },
    };
    logEvent('agentic_rag_complete', {
      runId,
      traceId: activeTraceId,
      citations: citations.length,
      retrievedCount: retrieved.length,
    });
    return response;
  }

  private async plan(query: string, workspaceId?: string, filters?: Metadata): Promise<PlannerStep> {
    return withSpan('plan', async () => ({
      plan: ['rewrite', 'retrieve', 'respond'],
      rewrittenQuery: `${query}${workspaceId ? ` in workspace ${workspaceId}` : ''}`.trim(),
    }));
  }

  private async applyTools(chunks: RetrievedChunk[], query: string): Promise<RetrievedChunk[]> {
    return withSpan('tool', async () => {
      const augmented: RetrievedChunk[] = [...chunks];
      if (/calculate|sum|total/gi.test(query)) {
        const numbers = chunks.flatMap((chunk) => (chunk.content.match(/\d+(?:\.\d+)?/g) ?? []).map(Number));
        if (numbers.length > 0) {
          const output = await this.toolRouter.route('calc', { expression: numbers.join('+') });
          augmented.unshift({
            id: 'calc',
            documentId: 'tool',
            content: `calculation: ${output.output}`,
            position: 0,
            startOffset: 0,
            endOffset: 0,
            score: 1,
            metadata: {},
          });
        }
      }
      return augmented;
    });
  }

  private synthesize(chunks: RetrievedChunk[], query: string): string {
    const leading = chunks.slice(0, 3).map((c) => c.content).join(' ');
    return `Answer to "${query}": ${leading}`;
  }

  private selfCheck(answer: string, citations: Citation[]) {
    return {
      passed: answer.length > 0 && citations.length > 0,
      citationCount: citations.length,
    };
  }
}
