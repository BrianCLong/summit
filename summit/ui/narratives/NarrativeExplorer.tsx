import type { NarrativeRecord } from './NarrativeBuilder';

interface NarrativeExplorerProps {
  narratives: NarrativeRecord[];
}

export function NarrativeExplorer({ narratives }: NarrativeExplorerProps) {
  return (
    <section aria-label="narrative-explorer">
      <h3>Narrative Explorer</h3>
      <p>Tracked narratives: {narratives.length}</p>
    </section>
  );
}
