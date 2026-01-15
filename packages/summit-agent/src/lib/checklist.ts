import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import { Checklist, ChecklistItem, ChecklistVerifier } from './types.js';

export function createDefaultChecklist(task: string): Checklist {
  const verifiers: ChecklistVerifier[] = [
    {
      id: 'lint',
      description: 'Repository lint checks',
      command: 'pnpm lint',
    },
    {
      id: 'typecheck',
      description: 'TypeScript typecheck',
      command: 'pnpm typecheck',
    },
    {
      id: 'test',
      description: 'Unit test suite',
      command: 'pnpm test:unit',
    },
  ];

  const items: ChecklistItem[] = [
    {
      id: 'task-delivery',
      title: `Deliver: ${task}`,
      requiredVerifiers: ['lint', 'typecheck', 'test'],
    },
  ];

  return {
    task,
    verifiers,
    items,
  };
}

export function serializeChecklist(checklist: Checklist): string {
  return yaml.dump(checklist, { lineWidth: 120 });
}

export function loadChecklist(path: string): Checklist {
  const contents = readFileSync(path, 'utf8');
  const data = yaml.load(contents) as Checklist;

  if (!data || !data.task || !Array.isArray(data.items)) {
    throw new Error('Checklist format invalid or missing required fields.');
  }

  return data;
}
