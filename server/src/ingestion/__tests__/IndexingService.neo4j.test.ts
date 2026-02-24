import { describe, it, expect, jest } from "@jest/globals";
import { IndexingService } from "../IndexingService.js";

describe("IndexingService Neo4j sync", () => {
  it("emits canonical relationship writes with idempotency sentinel", async () => {
    const runMock = jest.fn().mockResolvedValue({ records: [] });
    const executeWriteMock = jest
      .fn()
      .mockImplementation(async (work: any) => work({ run: runMock }));
    const closeMock = jest.fn().mockResolvedValue(undefined);

    const neo4jDriver = {
      session: jest.fn().mockReturnValue({
        executeWrite: executeWriteMock,
        close: closeMock,
      }),
    } as any;

    const pool = {
      connect: jest.fn().mockResolvedValue({
        query: jest.fn(),
        release: jest.fn(),
      }),
    } as any;

    const service = new IndexingService({
      pool,
      neo4jDriver,
      batchWritesEnabled: true,
    });

    await (service as any).syncToNeo4j(
      {
        entities: [
          {
            id: "entity-ind",
            tenantId: "tenant-a",
            kind: "custom",
            externalRefs: [],
            labels: ["Indicator"],
            properties: { value: "198.51.100.7" },
            sourceIds: [],
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "entity-src",
            tenantId: "tenant-a",
            kind: "custom",
            externalRefs: [],
            labels: ["Source"],
            properties: { uri: "https://example.test/doc" },
            sourceIds: [],
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        edges: [
          {
            id: "edge-mentions",
            tenantId: "tenant-a",
            fromEntityId: "entity-src",
            toEntityId: "entity-ind",
            kind: "custom",
            properties: { relationshipType: "MENTIONS" },
            sourceIds: [],
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "edge-derives",
            tenantId: "tenant-a",
            fromEntityId: "entity-ind",
            toEntityId: "entity-src",
            kind: "custom",
            properties: { relationshipType: "DERIVES_FROM" },
            sourceIds: [],
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "edge-generic",
            tenantId: "tenant-a",
            fromEntityId: "entity-src",
            toEntityId: "entity-ind",
            kind: "linked_to",
            properties: { score: 0.7 },
            sourceIds: [],
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
      {
        tenantId: "tenant-a",
        pipelineKey: "test-pipeline",
        logger: {},
      }
    );

    const cyphers = runMock.mock.calls.map((call) => call[0] as string);
    expect(cyphers.some((cypher) => cypher.includes("SET e:Indicator"))).toBe(true);
    expect(cyphers.some((cypher) => cypher.includes("SET e:Source"))).toBe(true);
    expect(cyphers.some((cypher) => cypher.includes("MERGE (from)-[r:MENTIONS"))).toBe(true);
    expect(cyphers.some((cypher) => cypher.includes("MERGE (from)-[r:DERIVES_FROM"))).toBe(true);
    expect(cyphers.some((cypher) => cypher.includes("MERGE (from)-[r:RELATIONSHIP"))).toBe(true);
    expect(cyphers.some((cypher) => cypher.includes("IngestRelationshipIdempotency"))).toBe(true);
    expect(
      runMock.mock.calls.some((call) =>
        JSON.stringify(call[1]).includes('"idempotencyToken":"tenant-a:edge:edge-mentions"')
      )
    ).toBe(true);
    expect(closeMock).toHaveBeenCalled();
  });
});
