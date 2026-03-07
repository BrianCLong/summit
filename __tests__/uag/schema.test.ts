// __tests__/uag/schema.test.ts
import { NodeKinds } from "../../analysis/uag/node-kinds.js";
import { EdgeKinds } from "../../analysis/uag/edge-kinds.js";
import {
  EvidenceEnvelope,
  GraphNode,
  GraphEdge,
  UniversalAssuranceGraph,
  ReportArtifact,
  MetricsArtifact,
  StampArtifact,
} from "../../analysis/uag/schema.js";

describe("Universal Assurance Graph Schema", () => {
  it("should define canonical NodeKinds", () => {
    expect(NodeKinds).toContain("Artifact");
    expect(NodeKinds).toContain("Policy");
  });

  it("should define canonical EdgeKinds", () => {
    expect(EdgeKinds).toContain("DEPENDS_ON");
    expect(EdgeKinds).toContain("VIOLATES");
  });

  it("should create valid evidence envelopes", () => {
    const envelope: EvidenceEnvelope = {
      id: "EVID::container::dockerfile::ghcr.io_org_api_base::0001",
      family: "container",
      source: "dockerfile",
      subject: "ghcr.io_org_api_base",
      seq: "0001",
      payload: { digest: "sha256:abcd" },
    };
    expect(envelope.id.startsWith("EVID::")).toBe(true);
  });

  it("should create valid nodes and edges", () => {
    const node: GraphNode = {
      id: "node-1",
      kind: "Artifact",
      properties: { name: "my-artifact" },
      evidenceIds: ["EVID::container::dockerfile::test::0001"],
    };

    const edge: GraphEdge = {
      id: "edge-1",
      source: "node-1",
      target: "node-2",
      kind: "DEPENDS_ON",
      properties: {},
      evidenceIds: ["EVID::container::dockerfile::test::0001"],
    };

    const graph: UniversalAssuranceGraph = {
      nodes: [node],
      edges: [edge],
    };

    expect(graph.nodes.length).toBe(1);
    expect(graph.edges.length).toBe(1);
  });

  it("should create deterministic artifacts without timestamps", () => {
    const report: ReportArtifact = {
      schemaVersion: "v1.0.0",
      findings: [
        {
          id: "finding-1",
          kind: "missing_attestation",
          message: "Missing attestation",
          affectedNodes: ["node-1"],
        },
      ],
    };

    const metrics: MetricsArtifact = {
      schemaVersion: "v1.0.0",
      counts: { nodes: 1 },
      confidenceBuckets: { high: 1 },
    };

    const stamp: StampArtifact = {
      schemaVersion: "v1.0.0",
      connectorVersions: { container: "v1" },
      fixtureDigests: { dockerfile: "sha256:abc" },
    };

    // Ensure no timestamps exist in the output structures
    expect(Object.keys(report)).not.toContain("timestamp");
    expect(Object.keys(metrics)).not.toContain("timestamp");
    expect(Object.keys(stamp)).not.toContain("timestamp");
  });
});
