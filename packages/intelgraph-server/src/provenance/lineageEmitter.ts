// packages/intelgraph-server/src/provenance/lineageEmitter.ts

import type {
  ProvenanceGraph,
  CommitNode,
  AttestationNode,
  SBOMNode,
  ArtifactNode,
  DeploymentNode,
} from "./graphTypes";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

export interface LineageIntegrity {
  has_full_provenance: boolean;
  edges_valid: boolean;
  no_gaps: boolean;
}

export interface LineageCheckInput {
  graph: ProvenanceGraph;
  integrity: LineageIntegrity;
}

export function createLineageGraph(params: {
  commit: CommitNode;
  attestation: AttestationNode;
  sbom: SBOMNode;
  artifacts: ArtifactNode[];
  deployments: DeploymentNode[];
}): ProvenanceGraph {
  const { commit, attestation, sbom, artifacts, deployments } = params;

  const nodes = [commit, attestation, sbom, ...artifacts, ...deployments];

  const edges = [
    {
      id: `commit-attests-${attestation.id}`,
      from: commit.id,
      to: attestation.id,
      type: "attests" as const,
    },
    {
      id: `commit-sbom-${sbom.id}`,
      from: commit.id,
      to: sbom.id,
      type: "contains" as const,
    },
    ...artifacts.map((artifact) => ({
      id: `commit-produces-${artifact.id}`,
      from: commit.id,
      to: artifact.id,
      type: "produces" as const,
    })),
    ...deployments.map((deployment) => ({
      id: `artifact-deploys-${deployment.id}`,
      from: commit.id,
      to: deployment.id,
      type: "deploys" as const,
    })),
  ];

  return { nodes, edges };
}

export function computeIntegrity(graph: ProvenanceGraph): LineageIntegrity {
  const hasFullProvenance = graph.nodes.length > 0 && graph.edges.length > 0;

  // For now, treat edges as valid if they reference existing nodes.
  const ids = new Set(graph.nodes.map((n) => n.id));
  const edgesValid = graph.edges.every((e) => ids.has(e.from) && ids.has(e.to));

  // You can extend this with more detailed acyclicity / reachability checks.
  const noGaps = hasFullProvenance && edgesValid;

  return {
    has_full_provenance: hasFullProvenance,
    edges_valid: edgesValid,
    no_gaps: noGaps,
  };
}

export function writeLineageJson(graph: ProvenanceGraph, outputDir = process.cwd()) {
  const integrity = computeIntegrity(graph);
  const out: LineageCheckInput = {
    graph,
    integrity,
  };

  const outPath = join(outputDir, "lineage.json");
  writeFileSync(outPath, JSON.stringify({ lineage: integrity }, null, 2), "utf-8");
  return outPath;
}
