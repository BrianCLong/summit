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

const getConfidenceColor = (score: number): string => {
  if (score >= 0.8) return '#4caf50'; // Green
  if (score >= 0.5) return '#ff9800'; // Orange
  return '#f44336'; // Red
};

const TimelinePanel: React.FC<TimelinePanelProps> = ({ events }) => (
  <aside className="timeline-panel" aria-label="Agent Actions Timeline">
    <h2>Agent Timeline</h2>
    <ul className="timeline-list">
      {events.map((e) => {
        const color = getConfidenceColor(e.confidence);
        const percent = Math.round(e.confidence * 100);
        return (
          <li
            key={e.id}
            className="timeline-item"
            style={{ borderLeft: `4px solid ${color}` }}
          >
            <div className="timeline-header">
              <span className="timeline-action">{e.action}</span>
              <span
                role="meter"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Confidence: ${percent}%`}
                className="timeline-confidence"
                style={{ backgroundColor: color }}
              >
                {percent}%
              </span>
            </div>
            <div className="timeline-result">
              {e.result}
            </div>
          </li>
        );
      })}
      {events.length === 0 && (
        <li className="timeline-empty">
          No events recorded yet.
        </li>
      )}
    </ul>
  </aside>
);

export default TimelinePanel;
