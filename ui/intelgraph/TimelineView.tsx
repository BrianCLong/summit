import React from 'react';
import { Timeline, type TimelineEvent } from '../design-system/Timeline';
import { Button } from '../design-system/Button';
import { Tabs } from '../design-system/Tabs';

export interface TimelineViewProps {
  events?: TimelineEvent[];
  onEventSelect?: (eventId: string) => void;
  onDateRangeChange?: (start: string, end: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ events = [], onEventSelect, onDateRangeChange }) => {
  const [view, setView] = React.useState('all');
  const [dateStart, setDateStart] = React.useState('');
  const [dateEnd, setDateEnd] = React.useState('');

  const tabs = [
    { id: 'all', label: 'All Events' },
    { id: 'entity', label: 'Entity Changes' },
    { id: 'relationship', label: 'Relationships' },
    { id: 'alert', label: 'Alerts' },
  ];

  const filteredEvents = view === 'all' ? events : events.filter((e) => e.type === view);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg-primary">Timeline</h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="h-8 px-2 bg-bg-secondary border border-border-default rounded text-xs text-fg-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
          />
          <span className="text-xs text-fg-tertiary">to</span>
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="h-8 px-2 bg-bg-secondary border border-border-default rounded text-xs text-fg-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
          />
          <Button variant="secondary" size="sm" onClick={() => onDateRangeChange?.(dateStart, dateEnd)}>Apply</Button>
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={view} onTabChange={setView} variant="pill" size="sm" />

      <Timeline events={filteredEvents} />

      {events.length === 0 && (
        <div className="py-12 text-center text-fg-tertiary text-sm">
          No timeline events available. Select entities or adjust the date range.
        </div>
      )}
    </div>
  );
};
