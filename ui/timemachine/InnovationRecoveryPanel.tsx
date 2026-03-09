import React from 'react';
import { Table, type Column } from '../design-system/Table';
import { StatusBadge } from '../design-system/StatusBadge';
import { Button } from '../design-system/Button';
import { Panel } from '../design-system/Panel';

export interface LostInnovation {
  id: string;
  name: string;
  type: 'feature' | 'algorithm' | 'pattern' | 'optimization';
  removedIn: string;
  removedDate: string;
  author: string;
  significance: number;
  recoverable: boolean;
  description: string;
}

export interface InnovationRecoveryPanelProps {
  innovations?: LostInnovation[];
  onRecover?: (innovationId: string) => void;
  onPreview?: (innovationId: string) => void;
}

export const InnovationRecoveryPanel: React.FC<InnovationRecoveryPanelProps> = ({ innovations = [], onRecover, onPreview }) => {
  const columns: Column<LostInnovation>[] = [
    { id: 'name', header: 'Innovation', accessor: (i) => <span className="font-medium">{i.name}</span> },
    { id: 'type', header: 'Type', accessor: (i) => <StatusBadge status="neutral" label={i.type} dot={false} /> },
    { id: 'significance', header: 'Significance', accessor: (i) => (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, idx) => (
          <span key={idx} className={`w-1.5 h-1.5 rounded-full ${idx < i.significance ? 'bg-brand-primary' : 'bg-bg-tertiary'}`} />
        ))}
      </div>
    )},
    { id: 'removed', header: 'Removed In', accessor: (i) => <span className="font-mono text-xs">{i.removedIn}</span> },
    { id: 'date', header: 'Date', accessor: (i) => i.removedDate },
    { id: 'recoverable', header: 'Status', accessor: (i) => (
      <StatusBadge status={i.recoverable ? 'success' : 'warning'} label={i.recoverable ? 'Recoverable' : 'Partial'} />
    )},
    { id: 'actions', header: '', accessor: (i) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onPreview?.(i.id); }}>Preview</Button>
        {i.recoverable && (
          <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); onRecover?.(i.id); }}>Recover</Button>
        )}
      </div>
    )},
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg-primary">Innovation Recovery</h1>
        <Button variant="secondary" size="sm">Scan for Lost Code</Button>
      </div>

      <Panel>
        <p className="text-sm text-fg-secondary">
          Discover and recover deleted features, abandoned algorithms, and lost optimizations from repository history.
          The recovery engine analyzes git history to find significant code removals that may represent valuable innovations.
        </p>
      </Panel>

      <Table columns={columns} data={innovations} keyExtractor={(i) => i.id} />
    </div>
  );
};
