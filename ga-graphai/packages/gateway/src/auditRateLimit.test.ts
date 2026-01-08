import { describe, expect, it } from "vitest";
import { GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql";
import type { GraphNode } from "@ga-graphai/knowledge-graph";
import { AppendOnlyAuditLog } from "prov-ledger";
import { GatewayRuntime } from "./index.js";
import { GraphQLRateLimiter } from "./graphql-cost.js";

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: "Query",
    fields: {
      ping: { type: GraphQLString, resolve: () => "pong" },
    },
  }),
});

describe("GatewayRuntime security controls", () => {
  it("records append-only audit events for GraphQL calls", async () => {
    const auditLog = new AppendOnlyAuditLog();
    const knowledgeGraph = {
      getNode: async () =>
        ({
          id: "svc-1",
          type: "service",
          data: { name: "svc" },
        }) satisfies GraphNode,
    } as never;

    const runtime = new GatewayRuntime({
      costGuard: { enabled: false },
      knowledgeGraph: { knowledgeGraph },
      audit: { log: auditLog, system: "test-gateway" },
    });

    const result = await runtime.execute(
      'query { graphNode(id: "svc-1") { id type } }',
      undefined,
      { tenantId: "tenant-a", actorId: "user-1" }
    );

    expect(result.errors).toBeUndefined();
    const events = auditLog.list();
    expect(events).toHaveLength(1);
    expect(events[0].actor).toBe("user-1");
    expect(events[0].action).toBe("graphql.execute");
    expect(events[0].system).toBe("test-gateway");
  });

  it("kills bursts that exceed configured DDoS guardrails", () => {
    const limiter = new GraphQLRateLimiter(schema, {
      maxRequestsPerWindow: 2,
      windowMs: 10_000,
    });

    limiter.beginExecution("query { ping }", "tenant-a");
    limiter.beginExecution("query { ping }", "tenant-a");
    const third = limiter.beginExecution("query { ping }", "tenant-a");

    expect(third.decision.action).toBe("kill");
    expect(third.decision.reasonCode).toBe("RATE_LIMIT_WINDOW");
  });
});
