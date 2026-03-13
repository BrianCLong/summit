import React from 'react';
import { Panel } from '../design-system/Panel';
import { Button } from '../design-system/Button';
import { StatusBadge } from '../design-system/StatusBadge';
import { CodeDiffViewer, type DiffLine } from '../design-system/CodeDiffViewer';

export interface ArchitectureDiff {
  componentName: string;
  changeType: 'added' | 'removed' | 'modified' | 'unchanged';
  before?: { lines: number; complexity: number; dependencies: number };
  after?: { lines: number; complexity: number; dependencies: number };
}

export interface ArchitectureDiffViewProps {
  snapshotA?: { version: string; timestamp: string };
  snapshotB?: { version: string; timestamp: string };
  diffs?: ArchitectureDiff[];
  codeChanges?: DiffLine[];
  onSelectSnapshots?: () => void;
}

export const ArchitectureDiffView: React.FC<ArchitectureDiffViewProps> = ({ snapshotA, snapshotB, diffs = [], codeChanges = [], onSelectSnapshots }) => {
  const changeColors: Record<string, 'success' | 'error' | 'warning' | 'neutral'> = {
    added: 'success', removed: 'error', modified: 'warning', unchanged: 'neutral',
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg-primary">Architecture Diff</h1>
        <Button variant="secondary" size="sm" onClick={onSelectSnapshots}>Select Snapshots</Button>
      </div>

      {/* Snapshot comparison header */}
      {snapshotA && snapshotB && (
        <div className="flex items-center gap-4 p-3 bg-bg-secondary rounded-lg border border-border-default">
          <div className="flex-1 text-center">
            <div className="text-xs text-fg-tertiary">From</div>
            <div className="text-sm font-semibold text-fg-primary">{snapshotA.version}</div>
            <div className="text-xs text-fg-tertiary">{snapshotA.timestamp}</div>
          </div>
          <svg className="w-6 h-6 text-fg-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <div className="flex-1 text-center">
            <div className="text-xs text-fg-tertiary">To</div>
            <div className="text-sm font-semibold text-fg-primary">{snapshotB.version}</div>
            <div className="text-xs text-fg-tertiary">{snapshotB.timestamp}</div>
          </div>
        </div>
      )}

      {/* Diff summary */}
      <div className="grid grid-cols-4 gap-3">
        <Panel padding="sm">
          <div className="text-xs text-fg-secondary">Added</div>
          <div className="text-xl font-bold text-semantic-success">{diffs.filter((d) => d.changeType === 'added').length}</div>
        </Panel>
        <Panel padding="sm">
          <div className="text-xs text-fg-secondary">Modified</div>
          <div className="text-xl font-bold text-semantic-warning">{diffs.filter((d) => d.changeType === 'modified').length}</div>
        </Panel>
        <Panel padding="sm">
          <div className="text-xs text-fg-secondary">Removed</div>
          <div className="text-xl font-bold text-semantic-error">{diffs.filter((d) => d.changeType === 'removed').length}</div>
        </Panel>
        <Panel padding="sm">
          <div className="text-xs text-fg-secondary">Unchanged</div>
          <div className="text-xl font-bold text-fg-secondary">{diffs.filter((d) => d.changeType === 'unchanged').length}</div>
        </Panel>
      </div>

      {/* Component diff list */}
      <Panel title="Component Changes">
        <div className="space-y-2">
          {diffs.map((diff) => (
            <div key={diff.componentName} className="flex items-center justify-between p-2 rounded border border-border-muted">
              <div className="flex items-center gap-2">
                <StatusBadge status={changeColors[diff.changeType]} label={diff.changeType} />
                <span className="text-sm font-mono text-fg-primary">{diff.componentName}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-fg-tertiary">
                {diff.after && <span>Lines: {diff.after.lines}</span>}
                {diff.after && <span>Complexity: {diff.after.complexity}</span>}
                {diff.after && <span>Deps: {diff.after.dependencies}</span>}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Code diff */}
      {codeChanges.length > 0 && (
        <CodeDiffViewer title="Code Changes" lines={codeChanges} />
      )}
    </div>
  );
};
