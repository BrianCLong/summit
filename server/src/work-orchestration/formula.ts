import type { FormulaTemplate, MoleculeStep } from './types';
import { makeDeterministicId } from './ids';

export interface CompiledMolecule {
  moleculeId: string;
  stepIds: string[];
  steps: MoleculeStep[];
}

export const compileFormula = (
  template: FormulaTemplate,
  options: {
    tenantId: string;
    convoyId: string;
    formulaId: string;
    createdBy: string;
  },
): CompiledMolecule => {
  const moleculeId = makeDeterministicId(
    `${options.tenantId}:${options.convoyId}:${options.formulaId}:${template.name}:${template.version}`,
  );

  const stepIds = template.steps.map((step) =>
    makeDeterministicId(
      `${options.tenantId}:${moleculeId}:${step.name}:${template.version}`,
    ),
  );

  const steps: MoleculeStep[] = template.steps.map((step, index) => {
    const stepId = stepIds[index];
    const dependsOn = (step.dependsOn || []).map((name) => {
      const dependencyIndex = template.steps.findIndex(
        (candidate) => candidate.name === name,
      );
      if (dependencyIndex < 0) {
        return makeDeterministicId(`${options.tenantId}:${moleculeId}:${name}`);
      }
      return stepIds[dependencyIndex];
    });

    return {
      id: stepId,
      tenantId: options.tenantId,
      moleculeId,
      name: step.name,
      status: 'pending',
      dependsOn,
      acceptanceCriteria: step.acceptanceCriteria || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: step.metadata || {},
    };
  });

  return { moleculeId, stepIds, steps };
};
