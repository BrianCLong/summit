import React from 'react';
import { Panel } from '../design-system/Panel';
import { Button } from '../design-system/Button';
import { StatusBadge } from '../design-system/StatusBadge';
import { Table, type Column } from '../design-system/Table';

export interface Pattern {
  id: string;
  name: string;
  type: 'structural' | 'temporal' | 'behavioral' | 'anomaly';
  frequency: number;
  confidence: number;
  nodeCount: number;
  lastSeen: string;
}

export interface PatternMinerProps {
  patterns?: Pattern[];
  onPatternSelect?: (patternId: string) => void;
  onRunMiner?: (config: { type: string; minSupport: number }) => void;
}

export const PatternMiner: React.FC<PatternMinerProps> = ({ patterns = [], onPatternSelect, onRunMiner }) => {
  const [minerType, setMinerType] = React.useState('structural');
  const [minSupport, setMinSupport] = React.useState(0.05);

  const columns: Column<Pattern>[] = [
    { id: 'name', header: 'Pattern', accessor: (r) => <span className="font-medium">{r.name}</span> },
    { id: 'type', header: 'Type', accessor: (r) => <StatusBadge status="info" label={r.type} dot={false} /> },
    { id: 'frequency', header: 'Freq', accessor: (r) => r.frequency, align: 'right' },
    { id: 'confidence', header: 'Confidence', accessor: (r) => `${(r.confidence * 100).toFixed(1)}%`, align: 'right' },
    { id: 'nodes', header: 'Nodes', accessor: (r) => r.nodeCount, align: 'right' },
    { id: 'lastSeen', header: 'Last Seen', accessor: (r) => r.lastSeen },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg-primary">Pattern Mining</h1>
        <Button size="sm" onClick={() => onRunMiner?.({ type: minerType, minSupport })}>Run Miner</Button>
      </div>

      {/* Miner config */}
      <Panel title="Configuration">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-fg-secondary mb-1">Pattern Type</label>
            <select
              value={minerType}
              onChange={(e) => setMinerType(e.target.value)}
              className="w-full h-9 px-3 bg-bg-primary border border-border-default rounded-md text-sm text-fg-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            >
              <option value="structural">Structural</option>
              <option value="temporal">Temporal</option>
              <option value="behavioral">Behavioral</option>
              <option value="anomaly">Anomaly</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-fg-secondary mb-1">Min Support</label>
            <input
              type="number"
              value={minSupport}
              onChange={(e) => setMinSupport(parseFloat(e.target.value))}
              step="0.01"
              min="0"
              max="1"
              className="w-full h-9 px-3 bg-bg-primary border border-border-default rounded-md text-sm text-fg-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
          </div>
        </div>
      </Panel>

      {/* Results */}
      <Table
        columns={columns}
        data={patterns}
        keyExtractor={(p) => p.id}
        onRowClick={(p) => onPatternSelect?.(p.id)}
        emptyMessage="Run the pattern miner to discover patterns in the graph"
      />
    </div>
  );
};
