import React from 'react';
import { Table, type Column } from '../design-system/Table';
import { MetricCard } from '../design-system/MetricCard';
import { Tabs } from '../design-system/Tabs';

export interface BenchmarkResult {
  id: string;
  agentName: string;
  benchmarkName: string;
  score: number;
  baseline: number;
  delta: number;
  passRate: number;
  duration: string;
  runDate: string;
}

export interface BenchmarkViewerProps {
  results?: BenchmarkResult[];
  onResultSelect?: (resultId: string) => void;
}

export const BenchmarkViewer: React.FC<BenchmarkViewerProps> = ({ results = [], onResultSelect }) => {
  const [view, setView] = React.useState('table');
  const tabs = [{ id: 'table', label: 'Table' }, { id: 'chart', label: 'Chart' }, { id: 'trends', label: 'Trends' }];

  const columns: Column<BenchmarkResult>[] = [
    { id: 'agent', header: 'Agent', accessor: (r) => <span className="font-medium">{r.agentName}</span> },
    { id: 'benchmark', header: 'Benchmark', accessor: (r) => r.benchmarkName },
    { id: 'score', header: 'Score', accessor: (r) => (
      <span className="font-semibold">{r.score.toFixed(2)}</span>
    ), align: 'right' },
    { id: 'baseline', header: 'Baseline', accessor: (r) => r.baseline.toFixed(2), align: 'right' },
    { id: 'delta', header: 'Delta', accessor: (r) => (
      <span className={r.delta >= 0 ? 'text-semantic-success' : 'text-semantic-error'}>
        {r.delta >= 0 ? '+' : ''}{r.delta.toFixed(2)}
      </span>
    ), align: 'right' },
    { id: 'pass', header: 'Pass Rate', accessor: (r) => `${r.passRate.toFixed(1)}%`, align: 'right' },
    { id: 'duration', header: 'Duration', accessor: (r) => r.duration },
    { id: 'date', header: 'Run Date', accessor: (r) => r.runDate },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg-primary">Agent Benchmarks</h1>
        <Tabs tabs={tabs} activeTab={view} onTabChange={setView} variant="segment" size="sm" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Avg Score" value={results.length > 0 ? (results.reduce((a, r) => a + r.score, 0) / results.length).toFixed(2) : '-'} status="info" />
        <MetricCard label="Regressions" value={results.filter((r) => r.delta < 0).length} status="error" />
        <MetricCard label="Improvements" value={results.filter((r) => r.delta > 0).length} status="success" />
      </div>

      <Table columns={columns} data={results} keyExtractor={(r) => r.id} onRowClick={(r) => onResultSelect?.(r.id)} />
    </div>
  );
};
