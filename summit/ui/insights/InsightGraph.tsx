import type { IntelGraphNode, IntelGraphRelationship } from '../integration/intelgraphTypes';

interface InsightGraphProps {
  nodes: IntelGraphNode[];
  relationships: IntelGraphRelationship[];
}

export function InsightGraph({ nodes, relationships }: InsightGraphProps) {
  return (
    <section aria-label="insight-graph">
      <h3>Insight Relationship Graph</h3>
      <p>
        Nodes: {nodes.length} | Relationships: {relationships.length}
      </p>
    </section>
  );
}
