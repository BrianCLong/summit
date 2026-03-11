import type { IntelGraphNode } from '../integration/intelgraphTypes';

interface EntitySearchProps {
  entities: IntelGraphNode[];
}

export function EntitySearch({ entities }: EntitySearchProps) {
  return (
    <section aria-label="entity-search">
      <h3>Entity Search</h3>
      <p>Entity matches: {entities.length}</p>
    </section>
  );
}
