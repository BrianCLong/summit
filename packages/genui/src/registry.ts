import { ComponentKind } from './schema.js';

export type ComponentDefinition = {
  kind: ComponentKind;
  displayName: string;
  requiresCitations: boolean;
  description: string;
};

export const componentRegistry: ComponentDefinition[] = [
  {
    kind: 'kpi',
    displayName: 'KPI',
    requiresCitations: true,
    description: 'Metric tiles with trend context and guardrail thresholds.',
  },
  {
    kind: 'table',
    displayName: 'Table',
    requiresCitations: true,
    description: 'Tabular evidence with sortable columns and row-level citations.',
  },
  {
    kind: 'timeline',
    displayName: 'Timeline',
    requiresCitations: true,
    description: 'Ordered events with provenance pointers and timestamps.',
  },
  {
    kind: 'graphView',
    displayName: 'Graph View',
    requiresCitations: true,
    description: 'Entity/relationship visualization with citation overlays.',
  },
  {
    kind: 'checklist',
    displayName: 'Checklist',
    requiresCitations: false,
    description: 'Structured action checklist with completion state.',
  },
  {
    kind: 'diff',
    displayName: 'Diff',
    requiresCitations: true,
    description: 'Before/after comparison panel with source references.',
  },
  {
    kind: 'callout',
    displayName: 'Callout',
    requiresCitations: true,
    description: 'Narrative insight callout with required attribution.',
  },
  {
    kind: 'form',
    displayName: 'Form',
    requiresCitations: false,
    description: 'Structured input form with policy-aware validation.',
  },
  {
    kind: 'stepper',
    displayName: 'Stepper',
    requiresCitations: false,
    description: 'Guided workflow steps with tool handoffs.',
  },
  {
    kind: 'citationList',
    displayName: 'Citation List',
    requiresCitations: false,
    description: 'Canonical citations panel for evidence overview.',
  },
];

export function getComponentDefinition(kind: ComponentKind): ComponentDefinition | undefined {
  return componentRegistry.find((entry) => entry.kind === kind);
}
