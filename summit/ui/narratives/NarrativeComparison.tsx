import type { NarrativeRecord } from './NarrativeBuilder';

interface NarrativeComparisonProps {
  baseline: NarrativeRecord;
  challenger: NarrativeRecord;
}

export function NarrativeComparison({ baseline, challenger }: NarrativeComparisonProps) {
  const eventDelta = challenger.linkedEvents.length - baseline.linkedEvents.length;

  return (
    <section aria-label="narrative-comparison">
      <h3>Narrative Conflict Detection</h3>
      <p>Event delta: {eventDelta}</p>
    </section>
  );
}
