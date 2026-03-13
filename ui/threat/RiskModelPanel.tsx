import React from 'react';
import { Panel } from '../design-system/Panel';
import { MetricCard } from '../design-system/MetricCard';
import { Table, type Column } from '../design-system/Table';
import { StatusBadge } from '../design-system/StatusBadge';

export interface RiskFactor {
  id: string;
  name: string;
  category: string;
  probability: number;
  impact: number;
  riskScore: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  mitigations: number;
  lastAssessed: string;
}

export interface RiskModelPanelProps {
  factors?: RiskFactor[];
  overallRisk?: number;
  onFactorSelect?: (factorId: string) => void;
}

export const RiskModelPanel: React.FC<RiskModelPanelProps> = ({ factors = [], overallRisk, onFactorSelect }) => {
  const trendColors: Record<string, string> = {
    increasing: 'text-semantic-error', decreasing: 'text-semantic-success', stable: 'text-fg-secondary',
  };
  const trendArrows: Record<string, string> = {
    increasing: '↑', decreasing: '↓', stable: '→',
  };

  const columns: Column<RiskFactor>[] = [
    { id: 'name', header: 'Risk Factor', accessor: (f) => <span className="font-medium">{f.name}</span> },
    { id: 'category', header: 'Category', accessor: (f) => <StatusBadge status="neutral" label={f.category} dot={false} /> },
    { id: 'probability', header: 'Probability', accessor: (f) => `${(f.probability * 100).toFixed(0)}%`, align: 'right' },
    { id: 'impact', header: 'Impact', accessor: (f) => (
      <span className={f.impact > 7 ? 'text-semantic-error font-semibold' : f.impact > 4 ? 'text-semantic-warning' : 'text-fg-primary'}>
        {f.impact}/10
      </span>
    ), align: 'right' },
    { id: 'risk', header: 'Risk Score', accessor: (f) => (
      <span className={`font-bold ${f.riskScore > 70 ? 'text-semantic-error' : f.riskScore > 40 ? 'text-semantic-warning' : 'text-semantic-success'}`}>
        {f.riskScore}
      </span>
    ), align: 'right' },
    { id: 'trend', header: 'Trend', accessor: (f) => (
      <span className={trendColors[f.trend]}>{trendArrows[f.trend]} {f.trend}</span>
    )},
    { id: 'mitigations', header: 'Mitigations', accessor: (f) => f.mitigations, align: 'center' },
    { id: 'assessed', header: 'Last Assessed', accessor: (f) => f.lastAssessed },
  ];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold text-fg-primary">Risk Model</h1>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Overall Risk"
          value={overallRisk ?? '-'}
          status={overallRisk && overallRisk > 70 ? 'error' : overallRisk && overallRisk > 40 ? 'warning' : 'success'}
        />
        <MetricCard label="Critical Factors" value={factors.filter((f) => f.riskScore > 70).length} status="error" />
        <MetricCard label="Increasing Risks" value={factors.filter((f) => f.trend === 'increasing').length} status="warning" />
        <MetricCard label="Mitigated" value={factors.filter((f) => f.mitigations > 0).length} status="success" />
      </div>

      {/* Risk heatmap */}
      <Panel title="Risk Heatmap" subtitle="Probability vs Impact matrix" noPadding>
        <div className="h-64 flex items-center justify-center text-fg-tertiary text-sm bg-bg-primary rounded-b-lg">
          Risk heatmap — probability (Y-axis) vs impact (X-axis) with factor positions
        </div>
      </Panel>

      <Table columns={columns} data={factors} keyExtractor={(f) => f.id} onRowClick={(f) => onFactorSelect?.(f.id)} />
    </div>
  );
};
