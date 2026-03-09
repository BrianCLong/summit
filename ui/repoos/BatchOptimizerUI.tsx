import React from 'react';
import { Panel } from '../design-system/Panel';
import { MetricCard } from '../design-system/MetricCard';
import { Button } from '../design-system/Button';
import { StatusBadge } from '../design-system/StatusBadge';
import { Table, type Column } from '../design-system/Table';

export interface BatchJob {
  id: string;
  name: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'optimized';
  priority: number;
  estimatedCost: number;
  actualCost?: number;
  duration?: string;
  resourceUsage: number;
  scheduledAt: string;
}

export interface BatchOptimizerUIProps {
  jobs?: BatchJob[];
  savingsPercent?: number;
  onOptimize?: () => void;
  onJobSelect?: (jobId: string) => void;
}

export const BatchOptimizerUI: React.FC<BatchOptimizerUIProps> = ({ jobs = [], savingsPercent, onOptimize, onJobSelect }) => {
  const statusMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'pending' | 'neutral'> = {
    queued: 'neutral', running: 'pending', completed: 'success', failed: 'error', optimized: 'info',
  };

  const columns: Column<BatchJob>[] = [
    { id: 'name', header: 'Job', accessor: (j) => <span className="font-medium">{j.name}</span> },
    { id: 'status', header: 'Status', accessor: (j) => <StatusBadge status={statusMap[j.status]} label={j.status} /> },
    { id: 'priority', header: 'Priority', accessor: (j) => j.priority, align: 'center' },
    { id: 'cost', header: 'Est. Cost', accessor: (j) => `$${j.estimatedCost.toFixed(2)}`, align: 'right' },
    { id: 'actual', header: 'Actual', accessor: (j) => j.actualCost !== undefined ? `$${j.actualCost.toFixed(2)}` : '-', align: 'right' },
    { id: 'resource', header: 'Resource %', accessor: (j) => (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
          <div className="h-full bg-brand-primary rounded-full" style={{ width: `${j.resourceUsage}%` }} />
        </div>
        <span className="text-xs text-fg-tertiary">{j.resourceUsage}%</span>
      </div>
    )},
    { id: 'scheduled', header: 'Scheduled', accessor: (j) => j.scheduledAt },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg-primary">Batch Optimizer</h1>
        <Button size="sm" onClick={onOptimize}>Run Optimization</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Cost Savings" value={savingsPercent !== undefined ? `${savingsPercent}%` : '-'} status="success" trend="up" change={{ value: savingsPercent ?? 0, period: '30d' }} />
        <MetricCard label="Active Jobs" value={jobs.filter((j) => j.status === 'running').length} status="info" />
        <MetricCard label="Queue Depth" value={jobs.filter((j) => j.status === 'queued').length} status="neutral" />
      </div>

      <Table columns={columns} data={jobs} keyExtractor={(j) => j.id} onRowClick={(j) => onJobSelect?.(j.id)} />
    </div>
  );
};
