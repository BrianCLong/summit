import { compileFormula } from '../formula';
import type { FormulaTemplate } from '../types';

describe('compileFormula', () => {
  it('creates deterministic molecule and step ids', () => {
    const template: FormulaTemplate = {
      name: 'deploy-release',
      version: 'v1',
      steps: [
        { name: 'plan', acceptanceCriteria: ['plan ready'] },
        { name: 'apply', dependsOn: ['plan'], acceptanceCriteria: ['apply done'] },
      ],
    };

    const compiled = compileFormula(template, {
      tenantId: 'tenant-1',
      convoyId: 'convoy-1',
      formulaId: 'formula-1',
      createdBy: 'agent-1',
    });

    expect(compiled.steps).toHaveLength(2);
    expect(compiled.stepIds).toHaveLength(2);
    expect(compiled.steps[1].dependsOn).toEqual([compiled.steps[0].id]);
    expect(compiled.moleculeId).toMatch(/^[0-9a-f-]{36}$/);
  });
});
