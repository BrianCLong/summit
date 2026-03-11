import type { IntelGraphNode } from '../integration/intelgraphTypes';

export interface NarrativeRecord {
  id: string;
  title: string;
  arc: string;
  linkedEvents: IntelGraphNode[];
  linkedEntities: IntelGraphNode[];
  linkedSources: IntelGraphNode[];
  linkedAgents: string[];
}

interface NarrativeBuilderProps {
  narrative: NarrativeRecord;
}

export function NarrativeBuilder({ narrative }: NarrativeBuilderProps) {
  return (
    <section aria-label="narrative-builder">
      <h2>Narrative Intelligence</h2>
      <p>{narrative.title}</p>
      <p>Arc: {narrative.arc}</p>
    </section>
  );
}
