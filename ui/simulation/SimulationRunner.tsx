import React from 'react';
import { MetricCard } from '../design-system/MetricCard';
import { Panel } from '../design-system/Panel';
import { Button } from '../design-system/Button';
import { StatusBadge } from '../design-system/StatusBadge';

export interface SimulationRun {
  id: string;
  name: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startedAt?: string;
  completedAt?: string;
  iterations: number;
  totalIterations: number;
  resourceUsage: number;
}

export interface SimulationRunnerProps {
  runs?: SimulationRun[];
  onStartRun?: (runId: string) => void;
  onStopRun?: (runId: string) => void;
  onViewResults?: (runId: string) => void;
}

export const SimulationRunner: React.FC<SimulationRunnerProps> = ({ runs = [], onStartRun, onStopRun, onViewResults }) => {
  const statusMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'pending' | 'neutral'> = {
    queued: 'neutral', running: 'pending', completed: 'success', failed: 'error', cancelled: 'warning',
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold text-fg-primary">Simulation Runner</h1>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Active" value={runs.filter((r) => r.status === 'running').length} status="info" />
        <MetricCard label="Queued" value={runs.filter((r) => r.status === 'queued').length} status="neutral" />
        <MetricCard label="Completed" value={runs.filter((r) => r.status === 'completed').length} status="success" />
        <MetricCard label="Failed" value={runs.filter((r) => r.status === 'failed').length} status="error" />
      </div>

      <div className="space-y-3">
        {runs.map((run) => (
          <Panel key={run.id}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-fg-primary">{run.name}</span>
                <StatusBadge status={statusMap[run.status]} label={run.status} />
              </div>
              <div className="flex items-center gap-2">
                {run.status === 'running' && <Button variant="danger" size="sm" onClick={() => onStopRun?.(run.id)}>Stop</Button>}
                {run.status === 'completed' && <Button variant="primary" size="sm" onClick={() => onViewResults?.(run.id)}>View Results</Button>}
                {run.status === 'queued' && <Button variant="secondary" size="sm" onClick={() => onStartRun?.(run.id)}>Start</Button>}
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-fg-tertiary">
                <span>{run.iterations} / {run.totalIterations} iterations</span>
                <span>{Math.round(run.progress)}%</span>
              </div>
              <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-slow ${run.status === 'failed' ? 'bg-semantic-error' : 'bg-brand-primary'}`}
                  style={{ width: `${run.progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-fg-tertiary">
              {run.startedAt && <span>Started: {run.startedAt}</span>}
              {run.completedAt && <span>Completed: {run.completedAt}</span>}
              <span>Resource usage: {run.resourceUsage}%</span>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
};
