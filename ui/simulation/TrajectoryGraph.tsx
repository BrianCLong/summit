import React from 'react';
import { Panel } from '../design-system/Panel';
import { Button } from '../design-system/Button';
import { Tabs } from '../design-system/Tabs';

export interface Trajectory {
  id: string;
  label: string;
  probability: number;
  steps: Array<{ timestamp: string; value: number; event?: string }>;
  convergencePoint?: string;
}

export interface TrajectoryGraphProps {
  trajectories?: Trajectory[];
  onTrajectorySelect?: (trajectoryId: string) => void;
}

export const TrajectoryGraph: React.FC<TrajectoryGraphProps> = ({ trajectories = [], onTrajectorySelect }) => {
  const [view, setView] = React.useState('graph');

  const tabs = [
    { id: 'graph', label: 'Graph View' },
    { id: 'table', label: 'Data Table' },
    { id: 'compare', label: 'Compare' },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg-primary">Trajectory Visualization</h1>
        <div className="flex items-center gap-2">
          <Tabs tabs={tabs} activeTab={view} onTabChange={setView} variant="segment" size="sm" />
          <Button variant="secondary" size="sm">Export</Button>
        </div>
      </div>

      {/* Main visualization */}
      <Panel noPadding>
        <div className="h-96 flex items-center justify-center text-fg-tertiary text-sm bg-bg-primary rounded-lg">
          Multi-dimensional trajectory graph — renders {trajectories.length} paths with branching and convergence points
        </div>
      </Panel>

      {/* Trajectory legend */}
      <div className="flex flex-wrap gap-3">
        {trajectories.map((traj, i) => {
          const colors = ['bg-viz-blue', 'bg-viz-purple', 'bg-viz-green', 'bg-viz-orange', 'bg-viz-red', 'bg-viz-cyan', 'bg-viz-pink'];
          return (
            <button
              key={traj.id}
              onClick={() => onTrajectorySelect?.(traj.id)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-default bg-bg-surface hover:border-brand-primary/40 transition-all text-sm"
            >
              <span className={`w-3 h-3 rounded-full ${colors[i % colors.length]}`} />
              <span className="text-fg-primary">{traj.label}</span>
              <span className="text-fg-tertiary text-xs">{(traj.probability * 100).toFixed(0)}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
