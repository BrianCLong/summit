import type { MoleculeStep } from './types';

export const resolveNextStep = (steps: MoleculeStep[]): MoleculeStep | null => {
  if (!steps.length) {
    return null;
  }

  const completed = new Set(
    steps.filter((step) => step.status === 'completed').map((step) => step.id),
  );

  const eligible = steps.filter((step) => {
    if (step.status !== 'pending' && step.status !== 'ready') {
      return false;
    }
    return step.dependsOn.every((dependency) => completed.has(dependency));
  });

  if (!eligible.length) {
    return null;
  }

  return eligible.sort((a, b) => a.name.localeCompare(b.name))[0];
};
