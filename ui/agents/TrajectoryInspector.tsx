import React from 'react';
import { Timeline, type TimelineEvent } from '../design-system/Timeline';
import { Panel } from '../design-system/Panel';
import { Card } from '../design-system/Card';
import { StatusBadge } from '../design-system/StatusBadge';
import { Button } from '../design-system/Button';

export interface TrajectoryStep {
  id: string;
  action: string;
  input: string;
  output: string;
  toolUsed?: string;
  duration: string;
  status: 'success' | 'error' | 'skipped';
  reasoning?: string;
}

export interface TrajectoryInspectorProps {
  agentName?: string;
  taskId?: string;
  steps?: TrajectoryStep[];
  onReplay?: (stepId: string) => void;
}

export const TrajectoryInspector: React.FC<TrajectoryInspectorProps> = ({ agentName, taskId, steps = [], onReplay }) => {
  const [selectedStep, setSelectedStep] = React.useState<string | null>(null);

  const statusMap: Record<string, TimelineEvent['type']> = {
    success: 'success', error: 'error', skipped: 'warning',
  };

  const events: TimelineEvent[] = steps.map((step, i) => ({
    id: step.id,
    timestamp: `Step ${i + 1}`,
    title: step.action,
    description: step.toolUsed ? `Tool: ${step.toolUsed} · ${step.duration}` : step.duration,
    type: statusMap[step.status] || 'default',
  }));

  const selected = steps.find((s) => s.id === selectedStep);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-fg-primary">Trajectory Inspector</h1>
          {agentName && <p className="text-xs text-fg-tertiary">{agentName} · Task: {taskId}</p>}
        </div>
        <Button variant="secondary" size="sm">Export Trajectory</Button>
      </div>

      <div className="flex gap-4">
        {/* Step timeline */}
        <div className="flex-1">
          <Panel title="Execution Steps" subtitle={`${steps.length} steps`}>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <button
                  key={step.id}
                  onClick={() => setSelectedStep(step.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedStep === step.id ? 'border-brand-primary bg-brand-primary/5' : 'border-border-muted hover:border-fg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-fg-tertiary font-mono">#{i + 1}</span>
                      <span className="text-sm font-medium text-fg-primary">{step.action}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-fg-tertiary">{step.duration}</span>
                      <StatusBadge status={step.status === 'success' ? 'success' : step.status === 'error' ? 'error' : 'warning'} label={step.status} />
                    </div>
                  </div>
                  {step.toolUsed && <span className="text-2xs text-fg-muted">Tool: {step.toolUsed}</span>}
                </button>
              ))}
            </div>
          </Panel>
        </div>

        {/* Step detail */}
        <aside className="w-96 shrink-0">
          {selected ? (
            <div className="space-y-3">
              <Panel title="Input">
                <pre className="text-xs font-mono text-fg-secondary whitespace-pre-wrap bg-bg-primary p-3 rounded border border-border-muted max-h-40 overflow-y-auto">
                  {selected.input}
                </pre>
              </Panel>
              <Panel title="Output">
                <pre className="text-xs font-mono text-fg-secondary whitespace-pre-wrap bg-bg-primary p-3 rounded border border-border-muted max-h-40 overflow-y-auto">
                  {selected.output}
                </pre>
              </Panel>
              {selected.reasoning && (
                <Panel title="Reasoning">
                  <p className="text-xs text-fg-secondary">{selected.reasoning}</p>
                </Panel>
              )}
              <Button variant="secondary" size="sm" onClick={() => onReplay?.(selected.id)} className="w-full">
                Replay from this step
              </Button>
            </div>
          ) : (
            <div className="text-center text-fg-tertiary text-sm py-12">Select a step to inspect</div>
          )}
        </aside>
      </div>
    </div>
  );
};
