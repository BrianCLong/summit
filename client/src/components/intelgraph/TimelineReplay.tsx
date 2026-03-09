import React from 'react';

interface TimelineReplayProps {
  events: Array<{ timestamp: string; label: string }>;
}

export const TimelineReplay: React.FC<TimelineReplayProps> = ({ events }) => {
  return (
    <div className="intelgraph-timeline border p-4">
      <h3>Timeline Replay</h3>
      {events.length === 0 ? (
        <p className="text-gray-500">No events to replay.</p>
      ) : (
        <ul className="list-disc pl-5">
          {events.map((evt, idx) => (
            <li key={idx}>
              <span className="font-mono text-sm text-gray-600">{evt.timestamp}</span>: {evt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
