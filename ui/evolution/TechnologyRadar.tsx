import React from 'react';
import { Panel } from '../design-system/Panel';
import { StatusBadge } from '../design-system/StatusBadge';
import { Tabs } from '../design-system/Tabs';
import { Table, type Column } from '../design-system/Table';

export interface TechnologySignal {
  id: string;
  name: string;
  quadrant: 'techniques' | 'tools' | 'platforms' | 'languages';
  ring: 'adopt' | 'trial' | 'assess' | 'hold';
  trend: 'up' | 'down' | 'stable';
  maturity: number;
  relevanceScore: number;
  description: string;
  lastUpdated: string;
}

export interface TechnologyRadarProps {
  signals?: TechnologySignal[];
  onSignalSelect?: (signalId: string) => void;
}

export const TechnologyRadar: React.FC<TechnologyRadarProps> = ({ signals = [], onSignalSelect }) => {
  const [quadrant, setQuadrant] = React.useState('all');

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'techniques', label: 'Techniques' },
    { id: 'tools', label: 'Tools' },
    { id: 'platforms', label: 'Platforms' },
    { id: 'languages', label: 'Languages' },
  ];

  const ringColors: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
    adopt: 'success', trial: 'info', assess: 'warning', hold: 'error',
  };

  const filtered = quadrant === 'all' ? signals : signals.filter((s) => s.quadrant === quadrant);

  const columns: Column<TechnologySignal>[] = [
    { id: 'name', header: 'Technology', accessor: (s) => <span className="font-medium">{s.name}</span> },
    { id: 'ring', header: 'Ring', accessor: (s) => <StatusBadge status={ringColors[s.ring]} label={s.ring} /> },
    { id: 'quadrant', header: 'Quadrant', accessor: (s) => <StatusBadge status="neutral" label={s.quadrant} dot={false} /> },
    { id: 'trend', header: 'Trend', accessor: (s) => (
      <span className={s.trend === 'up' ? 'text-semantic-success' : s.trend === 'down' ? 'text-semantic-error' : 'text-fg-secondary'}>
        {s.trend === 'up' ? '↑' : s.trend === 'down' ? '↓' : '→'} {s.trend}
      </span>
    )},
    { id: 'relevance', header: 'Relevance', accessor: (s) => `${(s.relevanceScore * 100).toFixed(0)}%`, align: 'right' },
    { id: 'updated', header: 'Updated', accessor: (s) => s.lastUpdated },
  ];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold text-fg-primary">Technology Radar</h1>

      {/* Radar visualization */}
      <Panel title="Radar View" noPadding>
        <div className="h-80 flex items-center justify-center text-fg-tertiary text-sm bg-bg-primary rounded-b-lg">
          Technology radar visualization — concentric rings (Adopt / Trial / Assess / Hold) with quadrant sectors
        </div>
      </Panel>

      <Tabs tabs={tabs} activeTab={quadrant} onTabChange={setQuadrant} variant="pill" size="sm" />
      <Table columns={columns} data={filtered} keyExtractor={(s) => s.id} onRowClick={(s) => onSignalSelect?.(s.id)} />
    </div>
  );
};
