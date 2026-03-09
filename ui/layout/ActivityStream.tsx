import React from 'react';

export interface ActivityEvent {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'agent';
  message: string;
  source: string;
  timestamp: string;
}

export interface ActivityStreamProps {
  onClose: () => void;
}

const typeStyles: Record<string, { dot: string; text: string }> = {
  info: { dot: 'bg-semantic-info', text: 'text-fg-secondary' },
  warning: { dot: 'bg-semantic-warning', text: 'text-semantic-warning' },
  error: { dot: 'bg-semantic-error', text: 'text-semantic-error' },
  success: { dot: 'bg-semantic-success', text: 'text-fg-secondary' },
  agent: { dot: 'bg-brand-primary', text: 'text-fg-secondary' },
};

/** Placeholder events for demonstration */
const sampleEvents: ActivityEvent[] = [
  { id: '1', type: 'agent', message: 'Agent "Concierge" completed investigation scan', source: 'Agent Orchestrator', timestamp: '2m ago' },
  { id: '2', type: 'success', message: 'PR #847 merged — governance checks passed', source: 'RepoOS', timestamp: '5m ago' },
  { id: '3', type: 'warning', message: 'Entropy drift detected in packages/agent-runtime', source: 'DriftLens', timestamp: '12m ago' },
  { id: '4', type: 'info', message: 'Technology radar updated — 3 new signals', source: 'Evolution Engine', timestamp: '18m ago' },
  { id: '5', type: 'error', message: 'Cascade risk elevated: supply-chain-mapper dependency', source: 'Cascade Detection', timestamp: '25m ago' },
];

export const ActivityStream: React.FC<ActivityStreamProps> = ({ onClose }) => {
  const events = sampleEvents;

  return (
    <aside className="w-80 shrink-0 bg-bg-secondary border-l border-border-default flex flex-col">
      <div className="h-10 flex items-center justify-between px-4 border-b border-border-default shrink-0">
        <h3 className="text-xs font-semibold text-fg-primary uppercase tracking-wider">Activity</h3>
        <button onClick={onClose} className="text-fg-tertiary hover:text-fg-primary transition-colors p-1 rounded hover:bg-bg-tertiary">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {events.map((event) => {
          const style = typeStyles[event.type];
          return (
            <div key={event.id} className="px-4 py-3 border-b border-border-muted hover:bg-bg-tertiary/30 transition-colors cursor-pointer">
              <div className="flex items-start gap-2">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
                <div className="min-w-0">
                  <p className={`text-xs ${style.text} leading-snug`}>{event.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xs text-fg-muted">{event.source}</span>
                    <span className="text-2xs text-fg-muted">{event.timestamp}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
