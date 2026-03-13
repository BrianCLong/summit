import React from 'react';
import { Panel } from '../design-system/Panel';
import { Card } from '../design-system/Card';
import { StatusBadge } from '../design-system/StatusBadge';
import { MetricCard } from '../design-system/MetricCard';

export interface SimulationOutcome {
  id: string;
  label: string;
  probability: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  metrics: Record<string, number>;
  description: string;
}

export interface OutcomeExplorerProps {
  outcomes?: SimulationOutcome[];
  simulationName?: string;
  onOutcomeSelect?: (outcomeId: string) => void;
}

export const OutcomeExplorer: React.FC<OutcomeExplorerProps> = ({ outcomes = [], simulationName, onOutcomeSelect }) => {
  const impactColors: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
    low: 'success', medium: 'info', high: 'warning', critical: 'error',
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold text-fg-primary">
        Outcome Explorer {simulationName && <span className="text-fg-secondary font-normal">— {simulationName}</span>}
      </h1>

      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Total Outcomes" value={outcomes.length} status="neutral" />
        <MetricCard label="Most Likely" value={outcomes.length > 0 ? `${(Math.max(...outcomes.map((o) => o.probability)) * 100).toFixed(0)}%` : '-'} status="info" />
        <MetricCard label="Critical Outcomes" value={outcomes.filter((o) => o.impact === 'critical').length} status="error" />
      </div>

      {/* Scenario tree visualization */}
      <Panel title="Outcome Distribution" noPadding>
        <div className="h-64 flex items-center justify-center text-fg-tertiary text-sm bg-bg-primary rounded-b-lg">
          Probability distribution / scenario tree visualization
        </div>
      </Panel>

      {/* Outcome cards */}
      <div className="space-y-3">
        {outcomes
          .sort((a, b) => b.probability - a.probability)
          .map((outcome) => (
            <Card key={outcome.id} variant="interactive" padding="md" onClick={() => onOutcomeSelect?.(outcome.id)}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-fg-primary">{outcome.label}</span>
                  <StatusBadge status={impactColors[outcome.impact]} label={outcome.impact} />
                </div>
                <span className="text-lg font-bold text-brand-primary">{(outcome.probability * 100).toFixed(1)}%</span>
              </div>
              <p className="text-xs text-fg-secondary mb-3">{outcome.description}</p>
              <div className="flex items-center gap-4">
                {Object.entries(outcome.metrics).slice(0, 4).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div className="text-xs text-fg-tertiary">{key}</div>
                    <div className="text-sm font-semibold text-fg-primary">{typeof value === 'number' ? value.toFixed(1) : value}</div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
};
