import type { IntelGraphNode } from '../integration/intelgraphTypes';

interface MissionEntitiesProps {
  entities: IntelGraphNode[];
}

export function MissionEntities({ entities }: MissionEntitiesProps) {
  return (
    <section aria-label="mission-entities">
      <h3>Mission Entities</h3>
      <p>Tracked entities: {entities.length}</p>
    </section>
  );
}
