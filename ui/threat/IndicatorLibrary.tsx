import React from 'react';
import { Table, type Column } from '../design-system/Table';
import { StatusBadge } from '../design-system/StatusBadge';
import { SearchBar } from '../design-system/SearchBar';
import { Button } from '../design-system/Button';
import { Tabs } from '../design-system/Tabs';

export interface Indicator {
  id: string;
  type: 'ip' | 'domain' | 'hash' | 'url' | 'email' | 'cve';
  value: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  firstSeen: string;
  lastSeen: string;
  tags: string[];
}

export interface IndicatorLibraryProps {
  indicators?: Indicator[];
  onIndicatorSelect?: (indicatorId: string) => void;
  onAddIndicator?: () => void;
}

export const IndicatorLibrary: React.FC<IndicatorLibraryProps> = ({ indicators = [], onIndicatorSelect, onAddIndicator }) => {
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('all');

  const tabs = [
    { id: 'all', label: 'All', badge: indicators.length },
    { id: 'ip', label: 'IPs' },
    { id: 'domain', label: 'Domains' },
    { id: 'hash', label: 'Hashes' },
    { id: 'url', label: 'URLs' },
  ];

  const severityColors: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
    low: 'success', medium: 'info', high: 'warning', critical: 'error',
  };

  const filtered = indicators
    .filter((i) => typeFilter === 'all' || i.type === typeFilter)
    .filter((i) => !search || i.value.toLowerCase().includes(search.toLowerCase()));

  const columns: Column<Indicator>[] = [
    { id: 'type', header: 'Type', accessor: (i) => <StatusBadge status="neutral" label={i.type.toUpperCase()} dot={false} />, width: '80px' },
    { id: 'value', header: 'Value', accessor: (i) => <span className="font-mono text-xs">{i.value}</span> },
    { id: 'severity', header: 'Severity', accessor: (i) => <StatusBadge status={severityColors[i.severity]} label={i.severity} /> },
    { id: 'confidence', header: 'Confidence', accessor: (i) => `${i.confidence}%`, align: 'right' },
    { id: 'source', header: 'Source', accessor: (i) => i.source },
    { id: 'firstSeen', header: 'First Seen', accessor: (i) => i.firstSeen },
    { id: 'lastSeen', header: 'Last Seen', accessor: (i) => i.lastSeen },
    { id: 'tags', header: 'Tags', accessor: (i) => (
      <div className="flex gap-1">
        {i.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="text-2xs px-1.5 py-0.5 bg-bg-tertiary text-fg-secondary rounded">{tag}</span>
        ))}
      </div>
    )},
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg-primary">Indicator Library</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">Import</Button>
          <Button size="sm" onClick={onAddIndicator}>Add Indicator</Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search indicators..." size="sm" className="flex-1 max-w-md" />
        <Tabs tabs={tabs} activeTab={typeFilter} onTabChange={setTypeFilter} variant="pill" size="sm" />
      </div>

      <Table columns={columns} data={filtered} keyExtractor={(i) => i.id} onRowClick={(i) => onIndicatorSelect?.(i.id)} compact />
    </div>
  );
};
