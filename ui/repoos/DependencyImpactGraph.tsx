import React from 'react';
import { Panel } from '../design-system/Panel';
import { StatusBadge } from '../design-system/StatusBadge';
import { Button } from '../design-system/Button';
import { Table, type Column } from '../design-system/Table';

export interface Dependency {
  id: string;
  name: string;
  version: string;
  latestVersion: string;
  type: 'direct' | 'transitive';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  vulnerabilities: number;
  dependents: number;
  lastUpdated: string;
}

export interface DependencyImpactGraphProps {
  dependencies?: Dependency[];
  onDependencySelect?: (depId: string) => void;
  onRunImpactAnalysis?: (depId: string) => void;
}

export const DependencyImpactGraph: React.FC<DependencyImpactGraphProps> = ({ dependencies = [], onDependencySelect, onRunImpactAnalysis }) => {
  const riskStatusMap: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    low: 'success', medium: 'warning', high: 'error', critical: 'error',
  };

  const columns: Column<Dependency>[] = [
    { id: 'name', header: 'Package', accessor: (d) => <span className="font-mono font-medium text-sm">{d.name}</span> },
    { id: 'version', header: 'Current', accessor: (d) => <span className="font-mono text-xs">{d.version}</span> },
    { id: 'latest', header: 'Latest', accessor: (d) => (
      <span className={`font-mono text-xs ${d.version !== d.latestVersion ? 'text-semantic-warning' : 'text-fg-secondary'}`}>{d.latestVersion}</span>
    )},
    { id: 'type', header: 'Type', accessor: (d) => <StatusBadge status="neutral" label={d.type} dot={false} /> },
    { id: 'risk', header: 'Risk', accessor: (d) => <StatusBadge status={riskStatusMap[d.riskLevel]} label={d.riskLevel} /> },
    { id: 'vulns', header: 'Vulns', accessor: (d) => (
      d.vulnerabilities > 0
        ? <span className="text-semantic-error font-semibold">{d.vulnerabilities}</span>
        : <span className="text-fg-tertiary">0</span>
    ), align: 'center' },
    { id: 'dependents', header: 'Dependents', accessor: (d) => d.dependents, align: 'right' },
    { id: 'actions', header: '', accessor: (d) => (
      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onRunImpactAnalysis?.(d.id); }}>
        Analyze Impact
      </Button>
    )},
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg-primary">Dependency Impact Analysis</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">Scan Now</Button>
          <Button variant="primary" size="sm">Upgrade Plan</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <Panel padding="sm">
          <div className="text-xs text-fg-secondary">Total</div>
          <div className="text-xl font-bold text-fg-primary">{dependencies.length}</div>
        </Panel>
        <Panel padding="sm">
          <div className="text-xs text-fg-secondary">Vulnerable</div>
          <div className="text-xl font-bold text-semantic-error">{dependencies.filter((d) => d.vulnerabilities > 0).length}</div>
        </Panel>
        <Panel padding="sm">
          <div className="text-xs text-fg-secondary">Outdated</div>
          <div className="text-xl font-bold text-semantic-warning">{dependencies.filter((d) => d.version !== d.latestVersion).length}</div>
        </Panel>
        <Panel padding="sm">
          <div className="text-xs text-fg-secondary">Critical Risk</div>
          <div className="text-xl font-bold text-semantic-error">{dependencies.filter((d) => d.riskLevel === 'critical').length}</div>
        </Panel>
      </div>

      {/* Graph visualization area */}
      <Panel title="Impact Graph" subtitle="Visual dependency tree with impact propagation paths" noPadding>
        <div className="h-64 flex items-center justify-center text-fg-tertiary text-sm bg-bg-primary rounded-b-lg">
          Dependency graph visualization — renders via d3 force-directed layout
        </div>
      </Panel>

      <Table
        columns={columns}
        data={dependencies}
        keyExtractor={(d) => d.id}
        onRowClick={(d) => onDependencySelect?.(d.id)}
        compact
      />
    </div>
  );
};
