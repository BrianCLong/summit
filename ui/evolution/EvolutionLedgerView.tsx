import React from 'react';
import { Timeline, type TimelineEvent } from '../design-system/Timeline';
import { Panel } from '../design-system/Panel';
import { MetricCard } from '../design-system/MetricCard';
import { Tabs } from '../design-system/Tabs';
import { SearchBar } from '../design-system/SearchBar';

export interface LedgerEntry {
  id: string;
  type: 'decision' | 'migration' | 'deprecation' | 'adoption' | 'refactor';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  author: string;
  timestamp: string;
  artifacts?: string[];
}

export interface EvolutionLedgerViewProps {
  entries?: LedgerEntry[];
  onEntrySelect?: (entryId: string) => void;
}

export const EvolutionLedgerView: React.FC<EvolutionLedgerViewProps> = ({ entries = [], onEntrySelect }) => {
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('all');

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'decision', label: 'Decisions' },
    { id: 'migration', label: 'Migrations' },
    { id: 'deprecation', label: 'Deprecations' },
    { id: 'adoption', label: 'Adoptions' },
  ];

  const impactTypeMap: Record<string, TimelineEvent['type']> = {
    low: 'info', medium: 'warning', high: 'error',
  };

  const filteredEntries = entries
    .filter((e) => filter === 'all' || e.type === filter)
    .filter((e) => !search || e.title.toLowerCase().includes(search.toLowerCase()));

  const timelineEvents: TimelineEvent[] = filteredEntries.map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    title: e.title,
    description: e.description,
    type: impactTypeMap[e.impact] || 'default',
    metadata: { type: e.type, impact: e.impact, author: e.author },
  }));

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold text-fg-primary">Evolution Ledger</h1>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Total Entries" value={entries.length} status="neutral" />
        <MetricCard label="Decisions" value={entries.filter((e) => e.type === 'decision').length} status="info" />
        <MetricCard label="Migrations" value={entries.filter((e) => e.type === 'migration').length} status="warning" />
        <MetricCard label="High Impact" value={entries.filter((e) => e.impact === 'high').length} status="error" />
      </div>

      <div className="flex items-center gap-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search ledger entries..." size="sm" className="flex-1 max-w-sm" />
        <Tabs tabs={tabs} activeTab={filter} onTabChange={setFilter} variant="pill" size="sm" />
      </div>

      <Timeline events={timelineEvents} />
    </div>
  );
};
