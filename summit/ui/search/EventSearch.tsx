import type { IntelGraphNode } from '../integration/intelgraphTypes';

interface EventSearchProps {
  events: IntelGraphNode[];
}

export function EventSearch({ events }: EventSearchProps) {
  return (
    <section aria-label="event-search">
      <h3>Event Search</h3>
      <p>Event matches: {events.length}</p>
    </section>
  );
}
