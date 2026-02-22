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

export interface RetrievalIntent {
  query: string;
  entities: string[];
  maxHops: number;
  maxEdges: number;
}

export interface EvidenceBudget {
  maxHops: number;
  maxEdges: number;
  maxPassages: number;
}

export interface IntentCompiler {
  compile(query: Query, budget: EvidenceBudget): RetrievalIntent;
}

export interface VectorDatabase {
  search(embedding: number[], k?: number): Promise<RetrievalResult>;
  insert(embedding: number[], result: RetrievalResult): Promise<void>;
}

export interface GraphDatabase {
  getRelationships(entity: Entity, intent: RetrievalIntent): Promise<GraphEdge[]>;
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

const DEFAULT_BUDGET: EvidenceBudget = {
  maxHops: 2,
  maxEdges: 100,
  maxPassages: 20,
};

function toEntity(id: string): Entity {
  return { id, type: "unknown", label: id };
}

function edgeKey(edge: GraphEdge): string {
  return `${edge.source}|${edge.type}|${edge.target}`;
}

function sortEdges(edges: GraphEdge[]): GraphEdge[] {
  return [...edges].sort((left, right) => {
    if (right.relevance !== left.relevance) return right.relevance - left.relevance;
    if (left.source !== right.source) return left.source.localeCompare(right.source);
    if (left.target !== right.target) return left.target.localeCompare(right.target);
    return left.type.localeCompare(right.type);
  });
}

function uniqueItems(values: string[], maxCount: number): string[] {
  return [...new Set(values)].slice(0, maxCount);
}

class DefaultIntentCompiler implements IntentCompiler {
  compile(query: Query, budget: EvidenceBudget): RetrievalIntent {
    return {
      query: query.text,
      entities: query.entities ?? [],
      maxHops: budget.maxHops,
      maxEdges: budget.maxEdges,
    };
  }
}

export class MemorizerAgent {
  constructor(
    private readonly vectorDB: VectorDatabase,
    private readonly graphDB: GraphDatabase,
    private readonly embedder: EmbeddingClient
  ) {}

  async recall(query: Query, intent: RetrievalIntent): Promise<MemoryResult> {
    const embedding = await this.embedder.embed(query.text);
    const vectorResults = await this.vectorDB.search(embedding, 10);
    const entities = intent.entities.map((id) => toEntity(id));

    const edges = new Map<string, GraphEdge>();
    for (const entity of entities) {
      const relationships = await this.graphDB.getRelationships(entity, intent);
      for (const relationship of relationships) {
        edges.set(edgeKey(relationship), relationship);
        if (edges.size >= intent.maxEdges) {
          break;
        }
      }
      if (edges.size >= intent.maxEdges) {
        break;
      }
    }

    const graphEdges = sortEdges(Array.from(edges.values()));
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
      result.graph?.nodes ?? (query.entities ?? []).map((entityId) => toEntity(entityId));
    const edges = result.graph?.edges ?? [];
    await this.graphDB.insertRelationships(entities, edges);
  }
}

export class GraphExpander {
  constructor(private readonly graphDB: GraphDatabase) {}

  async expand(entities: Entity[], intent: RetrievalIntent): Promise<ExpandedGraph> {
    const nodes = new Map<string, Entity>();
    const edges = new Map<string, GraphEdge>();
    let frontier = [...entities];

    for (const entity of entities) {
      nodes.set(entity.id, entity);
    }

    for (let depth = 0; depth < intent.maxHops; depth++) {
      const nextFrontier: Entity[] = [];
      for (const entity of frontier) {
        const relationships = await this.graphDB.getRelationships(entity, intent);
        for (const relationship of relationships) {
          const key = edgeKey(relationship);
          if (!edges.has(key)) {
            edges.set(key, relationship);
          }
          if (edges.size >= intent.maxEdges) {
            return {
              nodes: Array.from(nodes.values()),
              edges: sortEdges(Array.from(edges.values())),
            };
          }

          if (relationship.relevance >= 0.7 && !nodes.has(relationship.target)) {
            const relatedEntity = toEntity(relationship.target);
            nodes.set(relatedEntity.id, relatedEntity);
            nextFrontier.push(relatedEntity);
          }
        }
      }
      frontier = nextFrontier;
      if (frontier.length === 0) {
        break;
      }
    }

    return {
      nodes: Array.from(nodes.values()),
      edges: sortEdges(Array.from(edges.values())),
    };
  }
}

export class ResearcherAgent {
  constructor(
    private readonly embedder: EmbeddingClient,
    private readonly llm: LLMReasoner
  ) {}

  async investigate(gaps: ResearchGap[]): Promise<ResearchResult> {
    if (gaps.length === 0) {
      return { passages: [], entities: [], confidence: 0 };
    }

    const subQuestions = await this.llm.planResearch(gaps);
    const passages: string[] = [];
    for (const question of subQuestions) {
      await this.embedder.embed(question);
      passages.push(question);
    }

    const entities = [...new Set(gaps.flatMap((gap) => gap.missingEntities ?? []))].map((id) =>
      toEntity(id)
    );

    return {
      passages,
      entities,
      confidence: passages.length > 0 ? 0.7 : 0.2,
    };
  }

  async synthesizeAnswer(steps: ReasoningStep[], query: Query): Promise<string> {
    return this.llm.synthesizeAnswer(steps, query);
  }

  async estimateConfidence(steps: ReasoningStep[], query: Query): Promise<number> {
    return this.llm.estimateConfidence(steps, query);
  }
}

export class AgenticRAG {
  private readonly intentCompiler: IntentCompiler;
  private readonly evidenceBudget: EvidenceBudget;

  constructor(
    private readonly memorizer: MemorizerAgent,
    private readonly researcher: ResearcherAgent,
    private readonly graphExpander: GraphExpander,
    options?: {
      intentCompiler?: IntentCompiler;
      evidenceBudget?: Partial<EvidenceBudget>;
    }
  ) {
    this.intentCompiler = options?.intentCompiler ?? new DefaultIntentCompiler();
    this.evidenceBudget = {
      ...DEFAULT_BUDGET,
      ...(options?.evidenceBudget ?? {}),
    };
  }

  async retrieve(query: Query): Promise<RetrievalResult> {
    const intent = this.intentCompiler.compile(query, this.evidenceBudget);
    const memory = await this.memorizer.recall(query, intent);
    if (memory.confidence >= 0.9) {
      return memory;
    }

    const gaps: ResearchGap[] = [
      {
        question: query.text,
        missingEntities: intent.entities,
      },
    ];
    const research = await this.researcher.investigate(gaps);
    const entities =
      research.entities.length > 0 ? research.entities : intent.entities.map((id) => toEntity(id));
    const expandedGraph =
      entities.length > 0 ? await this.graphExpander.expand(entities, intent) : undefined;

    const result: RetrievalResult = {
      answers: memory.answers.length > 0 ? memory.answers : uniqueItems(research.passages, 5),
      supportingPassages: uniqueItems(
        [...memory.supportingPassages, ...research.passages],
        this.evidenceBudget.maxPassages
      ),
      graph: expandedGraph,
      confidence: Math.max(memory.confidence, research.confidence),
    };

    await this.memorizer.store(query, result);
    return result;
  }

  async multiStepReasoning(query: Query, maxSteps = 10): Promise<ReasoningResult> {
    const intent = this.intentCompiler.compile(query, this.evidenceBudget);
    const steps: ReasoningStep[] = [];
    const boundedSteps = Math.max(1, Math.min(maxSteps, 10));
    let currentQuery = { ...query };

    for (let i = 0; i < boundedSteps; i++) {
      const memory = await this.memorizer.recall(currentQuery, intent);
      const research = await this.researcher.investigate([
        {
          question: currentQuery.text,
          missingEntities: intent.entities,
        },
      ]);

      steps.push({
        knownFacts: memory,
        newFindings: research,
        reasoning: `Step ${i + 1}: combined memory retrieval and targeted research.`,
      });

      if (memory.confidence >= 0.9) {
        break;
      }

      currentQuery = {
        ...currentQuery,
        text: query.text,
      };
    }

    return {
      answer: await this.researcher.synthesizeAnswer(steps, query),
      steps,
      confidence: await this.researcher.estimateConfidence(steps, query),
    };
  }
}
