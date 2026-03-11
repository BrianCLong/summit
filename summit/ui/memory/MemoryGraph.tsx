import type { IntelGraphNode, IntelGraphRelationship } from '../integration/intelgraphTypes';

interface MemoryGraphProps {
  nodes: IntelGraphNode[];
  relationships: IntelGraphRelationship[];
}

export function MemoryGraph({ nodes, relationships }: MemoryGraphProps) {
  return (
    <section aria-label="memory-graph">
      <h3>Memory Graph Links</h3>
      <p>Linked entities and sources in IntelGraph.</p>
      <p>
        Nodes: {nodes.length} | Relationships: {relationships.length}
      </p>
    </section>
  );
}
