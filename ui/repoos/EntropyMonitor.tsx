import React from 'react';
import { MetricCard } from '../design-system/MetricCard';
import { Panel } from '../design-system/Panel';
import { StatusBadge } from '../design-system/StatusBadge';
import { Table, type Column } from '../design-system/Table';

export interface EntropySignal {
  id: string;
  module: string;
  currentEntropy: number;
  previousEntropy: number;
  drift: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  lastMeasured: string;
}

export interface EntropyMonitorProps {
  signals?: EntropySignal[];
  globalEntropy?: number;
  onSignalSelect?: (signalId: string) => void;
}

export const EntropyMonitor: React.FC<EntropyMonitorProps> = ({ signals = [], globalEntropy, onSignalSelect }) => {
  const severityMap: Record<string, 'success' | 'warning' | 'error'> = {
    low: 'success', medium: 'warning', high: 'error', critical: 'error',
  };

  const columns: Column<EntropySignal>[] = [
    { id: 'module', header: 'Module', accessor: (s) => <span className="font-mono text-xs font-medium">{s.module}</span> },
    { id: 'entropy', header: 'Entropy', accessor: (s) => s.currentEntropy.toFixed(3), align: 'right' },
    { id: 'drift', header: 'Drift', accessor: (s) => (
      <span className={s.drift > 0 ? 'text-semantic-error' : 'text-semantic-success'}>
        {s.drift > 0 ? '+' : ''}{s.drift.toFixed(3)}
      </span>
    ), align: 'right' },
    { id: 'severity', header: 'Severity', accessor: (s) => <StatusBadge status={severityMap[s.severity]} label={s.severity} /> },
    { id: 'measured', header: 'Measured', accessor: (s) => s.lastMeasured },
  ];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold text-fg-primary">Entropy Monitor</h1>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Global Entropy" value={globalEntropy?.toFixed(3) ?? '-'} status={globalEntropy && globalEntropy > 0.7 ? 'error' : 'neutral'} />
        <MetricCard label="High Drift Modules" value={signals.filter((s) => s.severity === 'high' || s.severity === 'critical').length} status="error" />
        <MetricCard label="Monitored Modules" value={signals.length} status="neutral" />
        <MetricCard label="Avg Drift" value={signals.length > 0 ? (signals.reduce((a, s) => a + Math.abs(s.drift), 0) / signals.length).toFixed(3) : '-'} status="neutral" />
      </div>

      {/* Heatmap placeholder */}
      <Panel title="Entropy Heatmap" subtitle="Module complexity and entropy distribution" noPadding>
        <div className="h-48 flex items-center justify-center text-fg-tertiary text-sm bg-bg-primary rounded-b-lg">
          Entropy heatmap visualization — renders via d3 heatmap
        </div>
      </Panel>

      <Table columns={columns} data={signals} keyExtractor={(s) => s.id} onRowClick={(s) => onSignalSelect?.(s.id)} />
    </div>
  );
};
