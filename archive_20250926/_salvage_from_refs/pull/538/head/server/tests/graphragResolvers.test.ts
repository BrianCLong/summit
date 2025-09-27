jest.mock("../src/services/GraphRAGService.js", () => ({
  GraphRAGService: class {
    answer = jest.fn().mockResolvedValue({
      answer: "answer",
      confidence: 0.9,
      citations: { entityIds: [] },
      why_paths: [],
    });
    getHealth = jest.fn().mockResolvedValue({ status: "ok" });
  },
}));

jest.mock("../src/services/SimilarityService.js", () => ({
  similarityService: {
    findSimilar: jest.fn().mockResolvedValue({
      results: [{ entityId: "1", similarity: 0.8, text: "t" }],
      executionTime: 1,
    }),
  },
  SimilarEntity: {}
}));

const neo4jSessionRun = jest.fn().mockResolvedValue({
  records: [
    {
      get: () => ({ properties: { id: "1", label: "L", description: "D" }, labels: ["Entity"] }),
    },
  ],
});

jest.mock("../src/config/database.js", () => ({
  getNeo4jDriver: () => ({ session: () => ({ run: neo4jSessionRun, close: jest.fn() }) }),
  getRedisClient: () => ({ keys: jest.fn().mockResolvedValue(["k"]), del: jest.fn() }),
}));

import { graphragResolvers } from "../src/graphql/resolvers/graphragResolvers";

describe("graphragResolvers", () => {
  const context = { user: { id: "u1", roles: [] } } as any;

  it("graphRagAnswer returns response", async () => {
    const result = await graphragResolvers.Query.graphRagAnswer(
      {},
      { input: { investigationId: "inv1", question: "q" } },
      context,
    );
    expect(result.answer).toBe("answer");
  });

  it("similarEntities returns entities", async () => {
    const result = await graphragResolvers.Query.similarEntities(
      {},
      { investigationId: "inv1", text: "hello" },
      context,
    );
    expect(result[0].entity.id).toBe("1");
    expect(neo4jSessionRun).toHaveBeenCalled();
  });

  it("clearGraphRAGCache returns success", async () => {
    const res = await graphragResolvers.Mutation.clearGraphRAGCache(
      {},
      { investigationId: "inv1" },
      context,
    );
    expect(res.success).toBe(true);
  });
});
