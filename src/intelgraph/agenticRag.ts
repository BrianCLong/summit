export interface Query {
  id?: string;
  text: string;
  entities?: string[];
}

export interface Entity {
  id: string;
  type: string;
  label: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  relevance: number;
}

export interface ExpandedGraph {
  nodes: Entity[];
  edges: GraphEdge[];
}

export interface RetrievalResult {
  answers: string[];
  supportingPassages: string[];
  graph?: ExpandedGraph;
  confidence: number;
}

export interface MemoryResult extends RetrievalResult {}

export interface ResearchGap {
  question: string;
  missingEntities?: string[];
}

export interface ResearchResult {
  passages: string[];
  entities: Entity[];
  confidence: number;
}

export interface ReasoningStep {
  knownFacts: MemoryResult;
  newFindings: ResearchResult;
  reasoning: string;
}

export interface ReasoningResult {
  answer: string;
  steps: ReasoningStep[];
  confidence: number;
}

export interface EvidenceBudget {
  maxEdges: number;
  maxDepth: number;
}

export interface GraphQueryIntent {
  entity: Entity;
  limit: number;
  orderBy: 'relevance' | 'created_at';
}

export interface IntentCompiler {
  compile(entity: Entity, budget: EvidenceBudget): GraphQueryIntent;
}

export interface VectorDatabase {
  search(embedding: number[], k?: number): Promise<RetrievalResult>;
  insert(embedding: number[], result: RetrievalResult): Promise<void>;
}

export interface GraphDatabase {
  getRelationships(intent: GraphQueryIntent): Promise<GraphEdge[]>;
  insertRelationships(entities: Entity[], edges?: GraphEdge[]): Promise<void>;
}

export interface EmbeddingClient {
  embed(text: string): Promise<number[]>;
}

export interface LLMReasoner {
  planResearch(gaps: ResearchGap[]): Promise<string[]>;
  synthesizeAnswer(steps: ReasoningStep[], query: Query): Promise<string>;
  estimateConfidence(steps: ReasoningStep[], query: Query): Promise<number>;
}

export const DEFAULT_EVIDENCE_BUDGET: EvidenceBudget = {
  maxEdges: 50,
  maxDepth: 2,
};

export class DefaultIntentCompiler implements IntentCompiler {
  compile(entity: Entity, budget: EvidenceBudget): GraphQueryIntent {
    const limit = Math.max(1, Math.min(25, budget.maxEdges));
    return {
      entity,
      limit,
      orderBy: 'relevance',
    };
  }
}

export class MemorizerAgent {
  constructor(
    private readonly vectorDB: VectorDatabase,
    private readonly graphDB: GraphDatabase,
    private readonly embedder: EmbeddingClient,
    private readonly intentCompiler: IntentCompiler = new DefaultIntentCompiler(),
    private readonly evidenceBudget: EvidenceBudget = DEFAULT_EVIDENCE_BUDGET,
  ) {}

  async recall(query: Query): Promise<MemoryResult> {
    const embedding = await this.embedder.embed(query.text);
    const vectorResults = await this.vectorDB.search(embedding, 10);

    const entities =
      query.entities?.map((entity) => ({
        id: entity,
        type: 'unknown',
        label: entity,
      })) ?? [];

    const graphEdges: GraphEdge[] = [];
    let remainingEdges = this.evidenceBudget.maxEdges;

    for (const entity of entities) {
      if (remainingEdges <= 0) break;
      const intent = this.intentCompiler.compile(entity, {
        ...this.evidenceBudget,
        maxEdges: remainingEdges,
      });
      const rels = await this.graphDB.getRelationships(intent);
      const bounded = rels.slice(0, intent.limit);
      graphEdges.push(...bounded);
      remainingEdges -= bounded.length;
    }

    return {
      answers: vectorResults.answers,
      supportingPassages: vectorResults.supportingPassages,
      graph:
        graphEdges.length > 0
          ? {
              nodes: entities,
              edges: graphEdges,
            }
          : undefined,
      confidence: vectorResults.confidence,
    };
  }

  async store(query: Query, result: RetrievalResult): Promise<void> {
    const embedding = await this.embedder.embed(query.text);
    await this.vectorDB.insert(embedding, result);

    const entities =
      result.graph?.nodes ??
      (query.entities ?? []).map((entity) => ({
        id: entity,
        type: 'unknown',
        label: entity,
      }));

    const edges = result.graph?.edges ?? [];
    await this.graphDB.insertRelationships(entities, edges);
  }
}

export class GraphExpander {
  constructor(
    private readonly graphDB: GraphDatabase,
    private readonly intentCompiler: IntentCompiler = new DefaultIntentCompiler(),
    private readonly evidenceBudget: EvidenceBudget = DEFAULT_EVIDENCE_BUDGET,
  ) {}

  async expand(entities: Entity[]): Promise<ExpandedGraph> {
    const nodes: Entity[] = [];
    const edges: GraphEdge[] = [];
    const maxDepth = Math.max(1, this.evidenceBudget.maxDepth);
    let remainingEdges = this.evidenceBudget.maxEdges;

    for (const entity of entities) {
      if (remainingEdges <= 0) break;
      nodes.push(entity);

      const intent = this.intentCompiler.compile(entity, {
        ...this.evidenceBudget,
        maxEdges: remainingEdges,
      });
      const rels = await this.graphDB.getRelationships(intent);
      const bounded = rels.slice(0, intent.limit);
      edges.push(...bounded);
      remainingEdges -= bounded.length;

      if (maxDepth <= 1 || remainingEdges <= 0) continue;

      for (const rel of bounded) {
        if (remainingEdges <= 0) break;
        if (rel.relevance < 0.7) continue;

        const secondIntent = this.intentCompiler.compile(
          {
            id: rel.target,
            type: 'unknown',
            label: rel.target,
          },
          {
            ...this.evidenceBudget,
            maxEdges: remainingEdges,
            maxDepth: maxDepth - 1,
          },
        );
        const secondOrder = await this.graphDB.getRelationships(secondIntent);
        const secondBounded = secondOrder.slice(0, secondIntent.limit);
        edges.push(...secondBounded);
        remainingEdges -= secondBounded.length;
      }
    }

    return { nodes, edges };
  }
}

export class ResearcherAgent {
  constructor(
    private readonly embedder: EmbeddingClient,
    private readonly llm: LLMReasoner,
  ) {}

  async investigate(gaps: ResearchGap[]): Promise<ResearchResult> {
    if (gaps.length === 0) {
      return { passages: [], entities: [], confidence: 0 };
    }

    const subQuestions = await this.llm.planResearch(gaps);

    const passages: string[] = [];
    const entities: Entity[] = [];

    for (const question of subQuestions) {
      passages.push(question);
    }

    return {
      passages,
      entities,
      confidence: 0.7,
    };
  }

  async synthesizeAnswer(steps: ReasoningStep[], query: Query): Promise<string> {
    return this.llm.synthesizeAnswer(steps, query);
  }

  async estimateConfidence(
    steps: ReasoningStep[],
    query: Query,
  ): Promise<number> {
    return this.llm.estimateConfidence(steps, query);
  }
}

export class AgenticRAG {
  private readonly memorizer: MemorizerAgent;
  private readonly researcher: ResearcherAgent;
  private readonly graphExpander: GraphExpander;

  constructor(
    memorizer: MemorizerAgent,
    researcher: ResearcherAgent,
    graphExpander: GraphExpander,
  ) {
    this.memorizer = memorizer;
    this.researcher = researcher;
    this.graphExpander = graphExpander;
  }

  async retrieve(query: Query): Promise<RetrievalResult> {
    const memory = await this.memorizer.recall(query);

    if (memory.confidence >= 0.9) {
      return memory;
    }

    const gaps: ResearchGap[] = [
      {
        question: query.text,
        missingEntities: query.entities,
      },
    ];
    const research = await this.researcher.investigate(gaps);

    const entities = research.entities.length
      ? research.entities
      : (query.entities ?? []).map((entity) => ({
          id: entity,
          type: 'unknown',
          label: entity,
        }));

    const expandedGraph = await this.graphExpander.expand(entities);

    const combinedPassages = [
      ...(memory.supportingPassages ?? []),
      ...(research.passages ?? []),
    ];

    const answers =
      memory.answers.length > 0 ? memory.answers : research.passages;

    const confidence = Math.max(memory.confidence, research.confidence);

    const result: RetrievalResult = {
      answers,
      supportingPassages: combinedPassages,
      graph: expandedGraph,
      confidence,
    };

    await this.memorizer.store(query, result);

    return result;
  }

  async multiStepReasoning(query: Query): Promise<ReasoningResult> {
    const steps: ReasoningStep[] = [];
    let currentQuery = query;
    const maxSteps = 10;

    for (let i = 0; i < maxSteps; i += 1) {
      const memory = await this.memorizer.recall(currentQuery);
      const gaps: ResearchGap[] = [
        {
          question: currentQuery.text,
          missingEntities: currentQuery.entities,
        },
      ];
      const research = await this.researcher.investigate(gaps);

      const reasoning = `Step ${i + 1}: combined memory and new research.`;

      steps.push({
        knownFacts: memory,
        newFindings: research,
        reasoning,
      });

      if (memory.confidence >= 0.9) {
        break;
      }

      currentQuery = {
        ...currentQuery,
        text: query.text,
      };
    }

    const answer = await this.researcher.synthesizeAnswer(steps, query);
    const confidence = await this.researcher.estimateConfidence(steps, query);

    return {
      answer,
      steps,
      confidence,
    };
  }
}
