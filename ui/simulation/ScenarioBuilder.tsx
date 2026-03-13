import React from 'react';
import { Panel } from '../design-system/Panel';
import { Button } from '../design-system/Button';
import { Card } from '../design-system/Card';

export interface ScenarioParameter {
  id: string;
  name: string;
  type: 'number' | 'select' | 'range' | 'boolean';
  value: unknown;
  options?: string[];
  min?: number;
  max?: number;
}

export interface ScenarioBuilderProps {
  parameters?: ScenarioParameter[];
  onParameterChange?: (paramId: string, value: unknown) => void;
  onRun?: (params: Record<string, unknown>) => void;
  onSave?: (name: string) => void;
}

export const ScenarioBuilder: React.FC<ScenarioBuilderProps> = ({ parameters = [], onParameterChange, onRun, onSave }) => {
  const [scenarioName, setScenarioName] = React.useState('');

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg-primary">Scenario Builder</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => onSave?.(scenarioName)}>Save</Button>
          <Button size="sm" onClick={() => {
            const params: Record<string, unknown> = {};
            parameters.forEach((p) => { params[p.id] = p.value; });
            onRun?.(params);
          }}>Run Simulation</Button>
        </div>
      </div>

      <Panel title="Scenario Name">
        <input
          type="text"
          value={scenarioName}
          onChange={(e) => setScenarioName(e.target.value)}
          placeholder="Enter scenario name..."
          className="w-full h-9 px-3 bg-bg-primary border border-border-default rounded-md text-sm text-fg-primary placeholder-fg-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
        />
      </Panel>

      <div className="grid grid-cols-2 gap-4">
        {parameters.map((param) => (
          <Card key={param.id} variant="outlined" padding="md">
            <label className="block text-xs font-medium text-fg-secondary mb-2">{param.name}</label>
            {param.type === 'number' && (
              <input
                type="number"
                value={param.value as number}
                onChange={(e) => onParameterChange?.(param.id, parseFloat(e.target.value))}
                min={param.min}
                max={param.max}
                className="w-full h-9 px-3 bg-bg-primary border border-border-default rounded-md text-sm text-fg-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
              />
            )}
            {param.type === 'select' && (
              <select
                value={param.value as string}
                onChange={(e) => onParameterChange?.(param.id, e.target.value)}
                className="w-full h-9 px-3 bg-bg-primary border border-border-default rounded-md text-sm text-fg-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
              >
                {param.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            )}
            {param.type === 'range' && (
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  value={param.value as number}
                  onChange={(e) => onParameterChange?.(param.id, parseFloat(e.target.value))}
                  min={param.min ?? 0}
                  max={param.max ?? 100}
                  className="flex-1"
                />
                <span className="text-sm text-fg-primary font-mono w-12 text-right">{String(param.value)}</span>
              </div>
            )}
            {param.type === 'boolean' && (
              <button
                onClick={() => onParameterChange?.(param.id, !(param.value as boolean))}
                className={`w-12 h-6 rounded-full transition-colors ${param.value ? 'bg-brand-primary' : 'bg-bg-tertiary'}`}
              >
                <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${param.value ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            )}
          </Card>
        ))}
      </div>

      {/* Visual scenario preview */}
      <Panel title="Scenario Preview" noPadding>
        <div className="h-48 flex items-center justify-center text-fg-tertiary text-sm bg-bg-primary rounded-b-lg">
          Scenario branching tree visualization
        </div>
      </Panel>
    </div>
  );
};
