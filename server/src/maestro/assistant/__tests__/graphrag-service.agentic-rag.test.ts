import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { GraphRAGAssistantService } from "../graphrag-service.js";

describe("GraphRAGAssistantService agentic retrieval", () => {
  const envSnapshot = { ...process.env };

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    process.env.ASSISTANT_RETRIEVAL_MODE = envSnapshot.ASSISTANT_RETRIEVAL_MODE;
    process.env.AGENTIC_RAG_MAX_HOPS = envSnapshot.AGENTIC_RAG_MAX_HOPS;
    process.env.AGENTIC_RAG_MAX_EDGES = envSnapshot.AGENTIC_RAG_MAX_EDGES;
    process.env.AGENTIC_RAG_MAX_PASSAGES = envSnapshot.AGENTIC_RAG_MAX_PASSAGES;
  });

  it("uses agentic_rag mode with bounded evidence output", async () => {
    process.env.ASSISTANT_RETRIEVAL_MODE = "agentic_rag";
    process.env.AGENTIC_RAG_MAX_PASSAGES = "3";

    const service = new GraphRAGAssistantService() as any;
    service.queryStructuredData = jest.fn(async () => [
      {
        id: "run_1",
        type: "run_data",
        status: "succeeded",
        source: "database",
        relevance: 1,
      },
      {
        id: "router_1",
        type: "router_data",
        selected_model: "gpt-4o-mini",
        policy_applied: "cost_policy",
        source: "database",
        relevance: 0.8,
      },
    ]);
    service.queryKnowledgeGraph = jest.fn(async () => [
      {
        id: "kb_1",
        type: "documentation",
        content: "Router decision process",
        source: "maestro-docs",
        relevance: 0.9,
      },
      {
        id: "kb_2",
        type: "best_practice",
        content: "Model selection policy",
        source: "best-practices",
        relevance: 0.7,
      },
    ]);
    service.extractEntities = jest.fn(async () => ["router"]);
    service.extractConcepts = jest.fn(async () => ["cost_analysis"]);

    const result = await service.retrieveFromGraph("Explain router decisions", {
      tenantId: "t1",
      userId: "u1",
    });

    expect(result.length).toBeLessThanOrEqual(5);
    expect(result.some((item: any) => item.source === "agentic_rag_memory")).toBe(true);
    expect(result.some((item: any) => item.source === "agentic_rag_graph")).toBe(true);
  });

  it("uses classic retrieval mode by default", async () => {
    process.env.ASSISTANT_RETRIEVAL_MODE = "classic";

    const service = new GraphRAGAssistantService() as any;
    service.queryKnowledgeGraph = jest.fn(async () => [
      {
        id: "kb_1",
        type: "documentation",
        content: "Classic retrieval node",
        source: "maestro-docs",
        relevance: 0.9,
      },
    ]);
    service.queryStructuredData = jest.fn(async () => [
      {
        id: "run_1",
        type: "run_data",
        status: "ok",
        source: "database",
        relevance: 1,
      },
    ]);
    service.extractEntities = jest.fn(async () => ["run"]);
    service.extractConcepts = jest.fn(async () => ["run_analysis"]);

    const result = await service.retrieveFromGraph("Show recent run status", {
      tenantId: "t1",
      userId: "u1",
    });

    expect(service.queryKnowledgeGraph).toHaveBeenCalledTimes(1);
    expect(service.queryStructuredData).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
    expect(result[0].source).toBe("maestro-docs");
  });
});
