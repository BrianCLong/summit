import type { TaskDefinition } from '../taskpack/schema.js';
import type { AdaptiveRubric, RubricDimension } from './types.js';

const generalDimensions: RubricDimension[] = [
  {
    id: 'clarity',
    label: 'Clarity & Structure',
    description: 'Report is well organized with a clear narrative and headings.',
    weight: 1,
    criteria: ['Has clear sections', 'Logical flow', 'Summaries actionable'],
    kind: 'general',
  },
  {
    id: 'evidence',
    label: 'Evidence Quality',
    description: 'Claims are backed by sources with sufficient coverage.',
    weight: 2,
    criteria: ['Sources cited or verifiable', 'Coverage across key claims'],
    kind: 'general',
  },
  {
    id: 'analysis',
    label: 'Analytical Depth',
    description: 'Provides synthesis, comparisons, and implications.',
    weight: 2,
    criteria: ['Cross-source synthesis', 'Explains implications'],
    kind: 'general',
  },
];

const governanceDimensions: RubricDimension[] = [
  {
    id: 'policy-compliance',
    label: 'Policy Compliance',
    description: 'Retrieval and outputs align with tenant policy constraints.',
    weight: 2,
    criteria: ['No denied sources', 'Jurisdiction constraints respected'],
    kind: 'governance',
  },
  {
    id: 'sensitive-data',
    label: 'Sensitive Data Handling',
    description: 'No leakage of restricted or sensitive data.',
    weight: 1.5,
    criteria: ['No PII exposure', 'Redaction when needed'],
    kind: 'governance',
  },
  {
    id: 'reproducibility',
    label: 'Reproducibility',
    description: 'Steps and sources enable repeatable verification.',
    weight: 1,
    criteria: ['Evidence traceable', 'Assumptions documented'],
    kind: 'governance',
  },
];

const buildTaskDimensions = (task: TaskDefinition): RubricDimension[] => {
  const objectives = task.objectives ?? [];
  if (objectives.length === 0) {
    return [
      {
        id: 'task-objective',
        label: 'Task Objective Completion',
        description: 'Satisfies the explicit objectives in the prompt.',
        weight: 3,
        criteria: ['Objectives addressed', 'Deliverables complete'],
        kind: 'task-specific',
      },
    ];
  }

  return objectives.map((objective, index) => ({
    id: `objective-${index + 1}`,
    label: `Objective ${index + 1}`,
    description: objective,
    weight: 3 / objectives.length,
    criteria: ['Objective fully addressed', 'Evidence tied to objective'],
    kind: 'task-specific',
  }));
};

export const generateAdaptiveRubric = (task: TaskDefinition, seed = task.id): AdaptiveRubric => {
  return {
    taskId: task.id,
    generatedAt: new Date().toISOString(),
    seed,
    dimensions: [...generalDimensions, ...governanceDimensions, ...buildTaskDimensions(task)],
    sourceTask: task,
  };
};
