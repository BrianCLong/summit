import { describe, expect, test } from "vitest";
import { Registry } from "prom-client";

import { IntelGraphQueryMonitor } from "../src/queryMonitor.js";
import { sandboxExecute } from "../src/sandbox.js";

const SAMPLE_PLAN = [
  "NodeByLabelScan(Person)",
  "Expand(EMPLOYED_BY -> Organization)",
  "Expand(EMPLOYED_BY -> Organization)",
];

const SAMPLE_CYPHER = "MATCH (p:Person)-[:EMPLOYED_BY*1..5]->(o:Organization) RETURN p, o";

describe("IntelGraphQueryMonitor", () => {
  test("flags high fan-out, alerts, and exposes histograms", async () => {
    const alerts: unknown[] = [];
    const monitor = new IntelGraphQueryMonitor({
      thresholds: { fanOut: 5, repetition: 1, expansionDepth: 2, throttleLimit: 3 },
      registry: new Registry(),
      alertSink: (payload) => alerts.push(payload),
    });

    const result = monitor.observe({
      cypher: SAMPLE_CYPHER,
      plan: SAMPLE_PLAN,
      rowsReturned: 22,
      latencyMs: 180,
      tenantId: "tenant-a",
    });

    expect(result.throttled).toBe(true);
    expect(result.throttleLimit).toBe(3);
    expect(result.anomalies.map((item) => item.type)).toContain("fan_out");
    expect(alerts).toHaveLength(1);

    const metrics = await monitor.metricsSnapshot();
    expect(metrics).toContain("intelgraph_query_fanout");
    expect(metrics).toContain("intelgraph_query_throttles_total");
  });
});

describe("sandboxExecute monitoring integration", () => {
  test("applies throttle when patterns look abusive", () => {
    const monitor = new IntelGraphQueryMonitor({
      thresholds: { fanOut: 2, repetition: 1, expansionDepth: 1, throttleLimit: 1 },
      registry: new Registry(),
    });

    const dataset = {
      nodes: Array.from({ length: 5 }).map((_, index) => ({
        id: `person-${index}`,
        label: "Person",
        properties: { name: `User ${index}` },
      })),
      relationships: [],
    };

    const result = sandboxExecute(
      {
        cypher: "MATCH (p:Person) RETURN p",
        tenantId: "tenant-abuse",
        policy: { authorityId: "case-1", purpose: "investigation" },
        dataset,
      },
      monitor
    );

    expect(result.monitoring.throttled).toBe(true);
    expect(result.rows.length).toBe(1);
    expect(result.truncated).toBe(true);
    expect(result.monitoring.anomalies.length).toBeGreaterThan(0);
  });
});
