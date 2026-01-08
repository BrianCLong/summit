import React, { useMemo } from "react";
import type { GraphEdge, GraphNode, GraphProvenance } from "@ga-graphai/knowledge-graph";

export interface LineageDashboardProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  lineage?: {
    nodesWithProvenance: number;
    edgesWithProvenance: number;
    missingNodes: string[];
    missingEdges: string[];
  };
}

function formatTimestamp(timestamp?: string): string {
  if (!timestamp) return "unknown";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function provenanceSummary(provenance?: GraphProvenance): string {
  if (!provenance) return "unverified";
  return [
    provenance.source,
    provenance.ingress,
    provenance.traceId ? `trace ${provenance.traceId}` : undefined,
    `hash ${provenance.checksum.slice(0, 8)}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function LineageDashboard({ nodes, edges, lineage }: LineageDashboardProps): JSX.Element {
  const annotatedNodes = useMemo(() => nodes.filter((node) => Boolean(node.provenance)), [nodes]);
  const recentNodes = useMemo(() => {
    return [...annotatedNodes]
      .sort((a, b) =>
        (b.provenance?.observedAt ?? "").localeCompare(a.provenance?.observedAt ?? "")
      )
      .slice(0, 6);
  }, [annotatedNodes]);

  const edgeCoverage = useMemo(
    () => edges.filter((edge) => Boolean(edge.provenance)).length,
    [edges]
  );

  const missingNodes =
    lineage?.missingNodes ?? nodes.filter((node) => !node.provenance).map((node) => node.id);
  const missingEdges =
    lineage?.missingEdges ?? edges.filter((edge) => !edge.provenance).map((edge) => edge.id);

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: 16,
          background: "#f8fafc",
        }}
        aria-label="Lineage Coverage"
      >
        <h3 style={{ margin: "0 0 8px 0" }}>Lineage Coverage</h3>
        <p style={{ margin: 0 }}>
          Nodes with provenance: {lineage?.nodesWithProvenance ?? annotatedNodes.length} /{" "}
          {nodes.length}
        </p>
        <p style={{ margin: 0 }}>
          Edges with provenance: {lineage?.edgesWithProvenance ?? edgeCoverage} / {edges.length}
        </p>
        {missingNodes.length > 0 || missingEdges.length > 0 ? (
          <div style={{ marginTop: 8 }}>
            <strong>Gaps detected:</strong>
            <ul>
              {missingNodes.map((id) => (
                <li key={`missing-node-${id}`}>missing {id}</li>
              ))}
              {missingEdges.map((id) => (
                <li key={`missing-edge-${id}`}>missing edge {id}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p style={{ marginTop: 8 }}>All graph elements include provenance.</p>
        )}
      </section>

      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: 16,
        }}
        aria-label="Recent Provenance"
      >
        <h3 style={{ margin: "0 0 8px 0" }}>Recent Provenance</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "4px 8px" }}>Node</th>
              <th style={{ textAlign: "left", padding: "4px 8px" }}>Observed</th>
              <th style={{ textAlign: "left", padding: "4px 8px" }}>Summary</th>
            </tr>
          </thead>
          <tbody>
            {recentNodes.map((node) => (
              <tr key={node.id}>
                <td style={{ padding: "4px 8px" }}>{node.id}</td>
                <td style={{ padding: "4px 8px" }}>
                  {formatTimestamp(node.provenance?.observedAt)}
                </td>
                <td style={{ padding: "4px 8px" }}>{provenanceSummary(node.provenance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
