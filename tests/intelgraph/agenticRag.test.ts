import {
  AgenticRAG,
  DefaultIntentCompiler,
  GraphDatabase,
  GraphEdge,
  MemorizerAgent,
  Query,
  RetrievalResult,
  EmbeddingClient,
  LLMReasoner,
  GraphExpander,
  ResearcherAgent,
  VectorDatabase,
  DEFAULT_EVIDENCE_BUDGET,
  GraphQueryIntent,
} from '../../src/intelgraph/agenticRag';

class FakeVectorDB implements VectorDatabase {
  public lastSearchEmbed?: number[];
  public stored: RetrievalResult[] = [];

  async search(embedding: number[]): Promise<RetrievalResult> {
    this.lastSearchEmbed = embedding;
    return (
      this.stored[0] ?? {
        answers: [],
        supportingPassages: [],
        confidence: 0,
      }
    );
  }

  async insert(_embedding: number[], result: RetrievalResult): Promise<void> {
    this.stored.push(result);
  }
}

class FakeGraphDB implements GraphDatabase {
  async getRelationships(intent: GraphQueryIntent): Promise<GraphEdge[]> {
    const edges = [
      {
        source: 'entity',
        target: 'entity-related',
        type: 'related',
        relevance: 0.8,
      },
    ];
    return edges.slice(0, intent.limit);
  }

  async insertRelationships(): Promise<void> {
    return undefined;
  }
}

class FakeEmbedder implements EmbeddingClient {
  async embed(text: string): Promise<number[]> {
    return [text.length];
  }
}

class FakeLLMReasoner implements LLMReasoner {
  async planResearch(gaps: { question: string }[]): Promise<string[]> {
    return gaps.map((gap) => `sub-question: ${gap.question}`);
  }

  async synthesizeAnswer(): Promise<string> {
    return 'final answer';
  }

  async estimateConfidence(): Promise<number> {
    return 0.8;
  }
}

describe('AgenticRAG', () => {
  it('falls back to research when memory confidence is low', async () => {
    const vector = new FakeVectorDB();
    const graph = new FakeGraphDB();
    const embedder = new FakeEmbedder();
    const llm = new FakeLLMReasoner();

    vector.stored = [
      {
        answers: [],
        supportingPassages: [],
        confidence: 0.1,
      },
    ];

    const intentCompiler = new DefaultIntentCompiler();
    const memorizer = new MemorizerAgent(
      vector,
      graph,
      embedder,
      intentCompiler,
      DEFAULT_EVIDENCE_BUDGET,
    );
    const researcher = new ResearcherAgent(embedder, llm);
    const expander = new GraphExpander(
      graph,
      intentCompiler,
      DEFAULT_EVIDENCE_BUDGET,
    );

    const rag = new AgenticRAG(memorizer, researcher, expander);

    const query: Query = { text: 'What is Summit?', entities: ['Summit'] };

    const result = await rag.retrieve(query);

    expect(result.supportingPassages.length).toBeGreaterThan(0);
    expect(result.graph).toBeDefined();
  });

  it('supports multi-step reasoning', async () => {
    const vector = new FakeVectorDB();
    const graph = new FakeGraphDB();
    const embedder = new FakeEmbedder();
    const llm = new FakeLLMReasoner();

    vector.stored = [
      {
        answers: ['cached answer'],
        supportingPassages: ['cached'],
        confidence: 0.95,
      },
    ];

    const intentCompiler = new DefaultIntentCompiler();
    const memorizer = new MemorizerAgent(
      vector,
      graph,
      embedder,
      intentCompiler,
      DEFAULT_EVIDENCE_BUDGET,
    );
    const researcher = new ResearcherAgent(embedder, llm);
    const expander = new GraphExpander(
      graph,
      intentCompiler,
      DEFAULT_EVIDENCE_BUDGET,
    );

    const rag = new AgenticRAG(memorizer, researcher, expander);

    const query: Query = { text: 'Explain Summit', entities: ['Summit'] };

    const result = await rag.multiStepReasoning(query);

    expect(result.answer).toBe('final answer');
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
  });
});
