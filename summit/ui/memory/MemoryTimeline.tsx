import type { InvestigationMemoryRecord } from './InvestigationMemory';

interface MemoryTimelineProps {
  timeline: InvestigationMemoryRecord['timeline'];
}

export function MemoryTimeline({ timeline }: MemoryTimelineProps) {
  const orderedTimeline = [...timeline].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return (
    <section aria-label="memory-timeline">
      <h3>Replayable Investigation Timeline</h3>
      <ol>
        {orderedTimeline.map((event) => (
          <li key={event.id}>
            <strong>{event.title}</strong> ({event.category}) — {event.timestamp}
          </li>
        ))}
      </ol>
    </section>
  );
}
