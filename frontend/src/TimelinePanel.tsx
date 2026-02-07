import React from 'react';

interface EventItem {
  id: string;
  action: string;
  confidence: number;
  result: string;
}

interface TimelinePanelProps {
  events: EventItem[];
}

// ⚡ Bolt Optimization: React.memo prevents re-rendering when other App state changes
const TimelinePanel: React.FC<TimelinePanelProps> = React.memo(({ events }) => (
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
