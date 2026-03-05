import type { DeclarativePipeline } from "./spec";

export interface LineageNode {
  id: string;
  type: "Pipeline" | "Dataset";
}

export interface LineageEdge {
  from: string;
  to: string;
  relation: "depends_on" | "produces";
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
}

export function isLineageEnabled(): boolean {
  return process.env.SUMMIT_PIPELINE_LINEAGE === "true";
}

export function buildLineageGraph(pipelines: DeclarativePipeline[]): LineageGraph {
  const nodes: LineageNode[] = [];
  const edges: LineageEdge[] = [];

  for (const pipeline of pipelines) {
    nodes.push({ id: pipeline.id, type: "Pipeline" });

    for (const dependency of pipeline.dependencies) {
      edges.push({
        from: pipeline.id,
        to: dependency,
        relation: "depends_on",
      });
    }

    for (const dataset of pipeline.datasets) {
      const datasetId = `${pipeline.id}:${dataset.name}`;
      nodes.push({ id: datasetId, type: "Dataset" });
      edges.push({
        from: pipeline.id,
        to: datasetId,
        relation: "produces",
      });
    }
  }

  return { nodes, edges };
}
