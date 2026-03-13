import React from 'react';
import { Panel } from '../design-system/Panel';
import { Button } from '../design-system/Button';
import { StatusBadge } from '../design-system/StatusBadge';

export interface ArchitectureSnapshot {
  id: string;
  version: string;
  timestamp: string;
  componentCount: number;
  dependencyCount: number;
  complexityScore: number;
  changes: string[];
}

export interface ArchitectureTimelineProps {
  snapshots?: ArchitectureSnapshot[];
  onSnapshotSelect?: (snapshotId: string) => void;
  onCompare?: (snapshotA: string, snapshotB: string) => void;
}

export const ArchitectureTimeline: React.FC<ArchitectureTimelineProps> = ({ snapshots = [], onSnapshotSelect, onCompare }) => {
  const [selectedSnapshots, setSelectedSnapshots] = React.useState<string[]>([]);

  const toggleSelection = (id: string) => {
    setSelectedSnapshots((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]
    );
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg-primary">Architecture Timeline</h1>
        {selectedSnapshots.length === 2 && (
          <Button size="sm" onClick={() => onCompare?.(selectedSnapshots[0], selectedSnapshots[1])}>Compare Selected</Button>
        )}
      </div>

      {/* Timeline visualization */}
      <Panel title="Architecture Evolution" noPadding>
        <div className="h-48 flex items-center justify-center text-fg-tertiary text-sm bg-bg-primary">
          Architecture evolution graph — renders component count, complexity, and dependency trends over time
        </div>
      </Panel>

      {/* Snapshot cards */}
      <div className="space-y-3">
        {snapshots.map((snapshot) => {
          const isSelected = selectedSnapshots.includes(snapshot.id);
          return (
            <button
              key={snapshot.id}
              onClick={() => { toggleSelection(snapshot.id); onSnapshotSelect?.(snapshot.id); }}
              className={`w-full text-left p-4 rounded-lg border transition-all ${
                isSelected ? 'border-brand-primary bg-brand-primary/5 shadow-glow' : 'border-border-default bg-bg-surface hover:border-fg-muted'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-fg-primary">{snapshot.version}</span>
                  <span className="text-xs text-fg-tertiary">{snapshot.timestamp}</span>
                </div>
                {isSelected && <StatusBadge status="info" label="Selected" />}
              </div>
              <div className="flex items-center gap-4 text-xs text-fg-secondary">
                <span>{snapshot.componentCount} components</span>
                <span>{snapshot.dependencyCount} dependencies</span>
                <span>Complexity: {snapshot.complexityScore.toFixed(1)}</span>
              </div>
              {snapshot.changes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {snapshot.changes.slice(0, 3).map((change, i) => (
                    <span key={i} className="text-2xs px-1.5 py-0.5 bg-bg-tertiary text-fg-secondary rounded">{change}</span>
                  ))}
                  {snapshot.changes.length > 3 && (
                    <span className="text-2xs text-fg-muted">+{snapshot.changes.length - 3} more</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
