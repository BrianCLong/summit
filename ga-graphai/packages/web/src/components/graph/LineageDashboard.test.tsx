import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { LineageDashboard } from "./LineageDashboard.js";
import type { GraphEdge, GraphNode } from "@ga-graphai/knowledge-graph";

const nodes: GraphNode[] = [
  {
    id: "service:svc-api",
    type: "service",
    data: {},
    provenance: {
      source: "cmdb",
      ingress: "database",
      observedAt: "2024-03-15T00:00:00Z",
      checksum: "svc-api-checksum",
      traceId: "trace-1",
    },
  },
  {
    id: "service:svc-db",
    type: "service",
    data: {},
  },
];

const edges: GraphEdge[] = [
  {
    id: "service:svc-api:DEPENDS_ON:service:svc-db",
    from: "service:svc-api",
    to: "service:svc-db",
    type: "DEPENDS_ON",
    provenance: {
      source: "graph-builder",
      ingress: "ingestion",
      observedAt: "2024-03-20T00:00:00Z",
      checksum: "edge-checksum",
    },
  },
];

describe("LineageDashboard", () => {
  it("renders lineage coverage and recent provenance", () => {
    const html = renderToString(
      <LineageDashboard
        nodes={nodes as never}
        edges={edges as never}
        lineage={{
          nodesWithProvenance: 1,
          edgesWithProvenance: 1,
          missingNodes: ["service:svc-db"],
          missingEdges: [],
        }}
      />
    );

    expect(html).toContain("Lineage Coverage");
    expect(html).toContain("service:svc-db");
    expect(html).toContain("hash svc-api-c");
  });
});
