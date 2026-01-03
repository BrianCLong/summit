import { z } from 'zod';
import { DeterministicEmbedder } from './embedder.js';
import { CitationBuilder } from './citationBuilder.js';
import { DefaultHybridRetriever } from './hybridRetriever.js';
import { ToolRouter } from './tooling.js';
import type {
  GraphStore,
  Metadata,
  PlannerStep,
  RAGResponse,
  RetrievedChunk,
  VectorStore,
} from './types.js';
import { withSpan, newRunId } from '../observability/instrumentation.js';

const requestSchema = z.object({
  query: z.string(),
  workspaceId: z.string().optional(),
  filters: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
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

  constructor(deps: RAGOrchestratorDependencies, options: { enableHttpFetch?: boolean } = {}) {
    this.vectorStore = deps.vectorStore;
    this.graphStore = deps.graphStore;
    this.embedder = deps.embedder ?? new DeterministicEmbedder();
    this.citationBuilder = new CitationBuilder();
    this.toolRouter = new ToolRouter({ enableHttpFetch: options.enableHttpFetch });
  }

  async answer(input: unknown): Promise<RAGResponse> {
    const parsed = requestSchema.parse(input);
    const runId = newRunId();
    const planner = await this.plan(parsed.query, parsed.filters as Metadata);
    const normalizedQuery = planner.rewrittenQuery;

    const embedding = await withSpan('compute_embedding', () => this.embedder.embed(normalizedQuery));
    const hydeEmbedding = parsed.useHyde
      ? await withSpan('hyde', () => this.embedder.embed(`hypothetical ${normalizedQuery}`))
      : undefined;

    const finalEmbedding = hydeEmbedding ?? embedding;
    const retriever = new DefaultHybridRetriever({
      vectorStore: this.vectorStore,
      graphStore: this.graphStore,
    });

    const retrieved = await withSpan('retrieve', () =>
      retriever.retrieve(finalEmbedding, parsed.filters as Metadata, { topK: parsed.topK })
    );

    const toolResults: RetrievedChunk[] = parsed.useTools
      ? await this.applyTools(retrieved, parsed.query)
      : retrieved;

    const citations = this.citationBuilder.build(toolResults);
    const answer = this.synthesize(toolResults, parsed.query);

    return {
      answer,
      citations,
      debug: { runId, plan: planner.plan, normalizedQuery, retrievedCount: retrieved.length },
    };
  }

  private async plan(query: string, filters?: Metadata): Promise<PlannerStep> {
    return withSpan('plan', async () => ({
      plan: ['rewrite', 'retrieve', 'respond'],
      rewrittenQuery: `${query}${filters?.workspaceId ? ` in workspace ${filters.workspaceId}` : ''}`.trim(),
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
}

