import React from 'react';
import { Panel } from '../design-system/Panel';
import { SearchBar } from '../design-system/SearchBar';
import { Button } from '../design-system/Button';
import { StatusBadge } from '../design-system/StatusBadge';
import { Tabs } from '../design-system/Tabs';

export interface ThreatActor {
  id: string;
  name: string;
  type: 'apt' | 'criminal' | 'hacktivist' | 'insider' | 'unknown';
  sophistication: 'low' | 'medium' | 'high' | 'advanced';
  campaigns: number;
  indicators: number;
  lastSeen: string;
}

export interface ThreatGraphProps {
  actors?: ThreatActor[];
  onActorSelect?: (actorId: string) => void;
}

export const ThreatGraph: React.FC<ThreatGraphProps> = ({ actors = [], onActorSelect }) => {
  const [search, setSearch] = React.useState('');
  const [view, setView] = React.useState('graph');

  const tabs = [
    { id: 'graph', label: 'Graph View' },
    { id: 'matrix', label: 'ATT&CK Matrix' },
    { id: 'list', label: 'Actor List' },
  ];

  const sophisticationColors: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
    low: 'success', medium: 'info', high: 'warning', advanced: 'error',
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg-primary">Threat Actor Graph</h1>
        <Tabs tabs={tabs} activeTab={view} onTabChange={setView} variant="segment" size="sm" />
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search threat actors, TTPs, campaigns..." size="sm" className="max-w-md" />

      {/* Graph visualization */}
      <Panel noPadding>
        <div className="h-96 flex items-center justify-center text-fg-tertiary text-sm bg-bg-primary rounded-lg">
          Threat actor relationship graph — nodes represent actors, edges represent TTPs and campaign linkage
        </div>
      </Panel>

      {/* Actor cards (shown in list view or below graph) */}
      <div className="grid grid-cols-2 gap-3">
        {actors.map((actor) => (
          <button
            key={actor.id}
            onClick={() => onActorSelect?.(actor.id)}
            className="text-left p-4 bg-bg-surface border border-border-default rounded-lg hover:border-brand-primary/40 hover:shadow-glow transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-fg-primary">{actor.name}</span>
              <StatusBadge status={sophisticationColors[actor.sophistication]} label={actor.sophistication} />
            </div>
            <div className="flex items-center gap-3 text-xs text-fg-secondary">
              <StatusBadge status="neutral" label={actor.type} dot={false} />
              <span>{actor.campaigns} campaigns</span>
              <span>{actor.indicators} indicators</span>
              <span>Last seen: {actor.lastSeen}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
