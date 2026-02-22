import React, { memo } from 'react';

interface EventItem {
  id: string;
  action: string;
  confidence: number;
  result: string;
}

interface TimelinePanelProps {
  events: EventItem[];
}

/**
 * TimelinePanel component.
 *
 * Optimized with React.memo to prevent unnecessary re-renders when the `events` prop
 * remains referentially equal. This improves performance in complex dashboards
 * where the parent component might re-render frequently.
 */
const TimelinePanel: React.FC<TimelinePanelProps> = memo(({ events }) => (
  <aside className="timeline-panel">
    <h2>Agent Timeline</h2>
    <ul>
      {events.map((e) => (
        <li key={e.id}>
          <strong>{e.action}</strong> ({e.confidence}) - {e.result}
        </li>
      ))}
    </ul>
  </aside>
));

export default TimelinePanel;
