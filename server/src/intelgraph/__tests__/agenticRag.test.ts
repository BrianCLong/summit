import { describe, expect, it } from "@jest/globals";
import {
  AgenticRAG,
  EmbeddingClient,
  Entity,
  GraphDatabase,
  GraphEdge,
  GraphExpander,
  LLMReasoner,
  MemorizerAgent,
  Query,
  ResearcherAgent,
  RetrievalIntent,
  RetrievalResult,
  VectorDatabase,
} from "../agenticRag.js";

class FakeVectorDB implements VectorDatabase {
  public stored: RetrievalResult[] = [];

  async search(): Promise<RetrievalResult> {
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
  async getRelationships(entity: Entity, _intent: RetrievalIntent): Promise<GraphEdge[]> {
    return [
      {
        source: entity.id,
        target: `${entity.id}-related`,
        type: "related",
        relevance: 0.8,
      },
    ];
  }

  async insertRelationships(): Promise<void> {
    // no-op
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
    return "final answer";
  }

  async estimateConfidence(): Promise<number> {
    return 0.8;
  }
}

describe("AgenticRAG", () => {
  it("falls back to research when memory confidence is low", async () => {
    const vectorDB = new FakeVectorDB();
    const graphDB = new FakeGraphDB();
    const embedder = new FakeEmbedder();
    const reasoner = new FakeLLMReasoner();

    vectorDB.stored = [
      {
        answers: [],
        supportingPassages: [],
        confidence: 0.1,
      },
    ];

    const rag = new AgenticRAG(
      new MemorizerAgent(vectorDB, graphDB, embedder),
      new ResearcherAgent(embedder, reasoner),
      new GraphExpander(graphDB)
    );

    const query: Query = { text: "What is Summit?", entities: ["Summit"] };
    const result = await rag.retrieve(query);

    expect(result.supportingPassages.length).toBeGreaterThan(0);
    expect(result.graph).toBeDefined();
  });

  it("supports multi-step reasoning", async () => {
    const vectorDB = new FakeVectorDB();
    const graphDB = new FakeGraphDB();
    const embedder = new FakeEmbedder();
    const reasoner = new FakeLLMReasoner();

    vectorDB.stored = [
      {
        answers: ["cached answer"],
        supportingPassages: ["cached"],
        confidence: 0.95,
      },
    ];

    const rag = new AgenticRAG(
      new MemorizerAgent(vectorDB, graphDB, embedder),
      new ResearcherAgent(embedder, reasoner),
      new GraphExpander(graphDB)
    );

    const query: Query = { text: "Explain Summit", entities: ["Summit"] };
    const result = await rag.multiStepReasoning(query);

    expect(result.answer).toBe("final answer");
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
  });
});
