import { describe, test, expect, vi } from "vitest";
import { TemporalGraphProjection } from "../src/projections/temporal-graph";
import { Neo4jClient } from "@intelgraph/graph";

// Mock Neo4jClient
class MockNeo4jClient {
  run = vi.fn().mockResolvedValue({ records: [] });
  close = vi.fn();
}

describe("TemporalGraphProjection", () => {
  test("should handle INSERT operation", async () => {
    const client = new MockNeo4jClient() as unknown as Neo4jClient;
    const projection = new TemporalGraphProjection(client);

    const change = {
      operation: "INSERT",
      table: "users",
      data: { id: "u1", name: "Alice" },
      ts_source: "2023-01-01T00:00:00Z",
      commit_lsn: "0/123456"
    };

    await projection.handle(change);

    expect(client.run).toHaveBeenCalled();
    // Check that run was called with expected query pattern
    expect(client.run.mock.calls[0][0]).toContain("MERGE (e:Entity {id: $entityId})");
  });
});
