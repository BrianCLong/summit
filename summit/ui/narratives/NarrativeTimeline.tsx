import type { NarrativeRecord } from './NarrativeBuilder';

interface NarrativeTimelineProps {
  narrative: NarrativeRecord;
}

export function NarrativeTimeline({ narrative }: NarrativeTimelineProps) {
  return (
    <section aria-label="narrative-timeline">
      <h3>Narrative Evolution</h3>
      <p>Linked events: {narrative.linkedEvents.length}</p>
    </section>
  );
}
