import React from 'react';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description?: string;
  type?: 'default' | 'success' | 'warning' | 'error' | 'info';
  icon?: React.ReactNode;
  metadata?: Record<string, string>;
}

export interface TimelineProps {
  events: TimelineEvent[];
  compact?: boolean;
  className?: string;
}

const dotColors: Record<string, string> = {
  default: 'bg-fg-tertiary',
  success: 'bg-semantic-success',
  warning: 'bg-semantic-warning',
  error: 'bg-semantic-error',
  info: 'bg-semantic-info',
};

export const Timeline: React.FC<TimelineProps> = ({ events, compact = false, className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-3 top-0 bottom-0 w-px bg-border-default" />
      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.id} className="relative flex items-start gap-4 pl-8">
            <div className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-bg-surface ${dotColors[event.type || 'default']}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-fg-tertiary font-mono">{event.timestamp}</span>
              </div>
              <p className={`text-fg-primary ${compact ? 'text-xs' : 'text-sm'} font-medium mt-0.5`}>{event.title}</p>
              {event.description && <p className="text-xs text-fg-secondary mt-1">{event.description}</p>}
              {event.metadata && (
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {Object.entries(event.metadata).map(([key, value]) => (
                    <span key={key} className="inline-flex text-2xs px-1.5 py-0.5 rounded bg-bg-tertiary text-fg-secondary">
                      {key}: {value}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
