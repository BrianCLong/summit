import { describe, expect, it, beforeEach, vi } from "vitest";
import { GatewayRuntime } from "./index.js";
import type { GraphNode } from "@ga-graphai/knowledge-graph";

describe("GatewayRuntime knowledge graph integration", () => {
  const cache = new Map<string, string>();
  const cacheClient = {
    async get(key: string) {
      return cache.get(key) ?? null;
    },
    async setEx(key: string, _ttlSeconds: number, value: string) {
      cache.set(key, value);
    },
  };

  beforeEach(() => {
    cache.clear();
  });

  it("batches node loads via DataLoader and populates cache", async () => {
    const knowledgeGraph = {
      getNode: vi
        .fn<[string], GraphNode | null>()
        .mockResolvedValue({ id: "svc-1", type: "service", data: { name: "svc" } }),
    } as never;

    const runtime = new GatewayRuntime({
      costGuard: { enabled: false },
      knowledgeGraph: { knowledgeGraph, cacheClient, cacheTtlSeconds: 60 },
    });

    const query = `query($ids: [ID!]!) { graphNodes(ids: $ids) { id type } }`;
    const result = await runtime.execute(query, { ids: ["svc-1", "svc-1"] });

    expect(result.errors).toBeUndefined();
    expect(result.data?.graphNodes).toHaveLength(2);
    expect(knowledgeGraph.getNode).toHaveBeenCalledTimes(1);
    expect(cache.has("kg:node:svc-1")).toBe(true);
  });

  it("returns cached nodes without hitting the knowledge graph", async () => {
    cache.set(
      "kg:node:svc-cached",
      JSON.stringify({ id: "svc-cached", type: "service", data: {} })
    );
    const knowledgeGraph = {
      getNode: vi.fn<[string], GraphNode | null>().mockResolvedValue(null),
    } as never;

    const runtime = new GatewayRuntime({
      costGuard: { enabled: false },
      knowledgeGraph: { knowledgeGraph, cacheClient, cacheTtlSeconds: 60 },
    });

    const query = `query { graphNode(id: "svc-cached") { id type } }`;
    const result = await runtime.execute(query);

    expect(result.errors).toBeUndefined();
    expect(result.data?.graphNode?.id).toBe("svc-cached");
    expect(knowledgeGraph.getNode).not.toHaveBeenCalled();
  });
});
