import React, { useEffect, useRef, useState } from "react";
import cytoscape, { Core, ElementsDefinition } from "cytoscape";
import panzoom from "cytoscape-panzoom";
import coseBilkent from "cytoscape-cose-bilkent";

cytoscape.use(panzoom);
cytoscape.use(coseBilkent);

interface NodeData {
  id: string;
  label: string;
  cluster?: string;
  metadata?: Record<string, unknown>;
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
  type: string;
}

interface GraphExplorerProps {
  nodes: NodeData[];
  edges: EdgeData[];
}

const clusterPalette = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf",
];

const typePalette = clusterPalette;

const colorFor = (value: string, palette: string[]) => {
  const hash = Array.from(value).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0,
  );
  return palette[hash % palette.length];
};

export const GraphExplorer: React.FC<GraphExplorerProps> = ({
  nodes,
  edges,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    data: NodeData;
    position: { x: number; y: number };
  } | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [edgeColors, setEdgeColors] = useState<Record<string, string>>({});
  const [relationshipTypes, setRelationshipTypes] = useState<string[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const relTypes = Array.from(new Set(edges.map((e) => e.type)));
    setRelationshipTypes(relTypes);
    const relColorMap: Record<string, string> = {};
    relTypes.forEach((type) => {
      relColorMap[type] = colorFor(type, typePalette);
    });
    setEdgeColors(relColorMap);

    const elements: ElementsDefinition = {
      nodes: nodes.map((n) => ({
        data: { ...n, color: colorFor(n.cluster || "default", clusterPalette) },
      })),
      edges: edges.map((e) => ({
        data: { ...e, color: relColorMap[e.type] },
      })),
    };

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "background-color": "data(color)",
            color: "#fff",
            "text-valign": "center",
            width: 32,
            height: 32,
          },
        },
        {
          selector: "edge",
          style: {
            label: "data(type)",
            width: 2,
            "line-color": "data(color)",
            "target-arrow-color": "data(color)",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
          },
        },
        {
          selector: "edge.dimmed",
          style: { opacity: 0.1 },
        },
        {
          selector: "edge.highlight",
          style: {
            width: 4,
            "line-color": "#ff4136",
            "target-arrow-color": "#ff4136",
          },
        },
      ],
      layout: { name: "cose-bilkent", animate: false },
    });

    cy.panzoom();

    cy.on("mouseover", "node", (evt) => {
      const node = evt.target;
      const position = evt.renderedPosition;
      setHoverInfo({ data: node.data() as NodeData, position });
    });

    cy.on("mouseout", "node", () => setHoverInfo(null));

    cy.on("tap", "node", (evt) => {
      setSelectedNode(evt.target.data() as NodeData);
    });

    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [nodes, edges]);

  const highlightEdges = (type: string) => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.edges().addClass("dimmed").removeClass("highlight");
    cy.edges(`[type = "${type}"]`).removeClass("dimmed").addClass("highlight");
  };

  const resetHighlight = () => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.edges().removeClass("dimmed").removeClass("highlight");
  };

  return (
    <div style={{ display: "flex" }}>
      <div
        ref={containerRef}
        style={{
          flex: 1,
          height: 600,
          position: "relative",
          border: "1px solid #ccc",
        }}
      >
        {hoverInfo && (
          <div
            style={{
              position: "absolute",
              top: hoverInfo.position.y + 8,
              left: hoverInfo.position.x + 8,
              background: "#fff",
              border: "1px solid #ddd",
              padding: 4,
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            <strong>{hoverInfo.data.label}</strong>
          </div>
        )}
      </div>
      <aside style={{ width: 260, padding: 16, borderLeft: "1px solid #ccc" }}>
        {selectedNode ? (
          <div>
            <h3 style={{ marginTop: 0 }}>{selectedNode.label}</h3>
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {JSON.stringify(selectedNode.metadata, null, 2)}
            </pre>
          </div>
        ) : (
          <p>Click a node to inspect its details.</p>
        )}
        <div>
          <h4>Legend</h4>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {relationshipTypes.map((type) => (
              <li
                key={type}
                onMouseEnter={() => highlightEdges(type)}
                onMouseLeave={resetHighlight}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: edgeColors[type],
                    display: "inline-block",
                  }}
                />
                {type}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
};

export default GraphExplorer;
