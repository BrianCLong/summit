import { resolveNextStep } from '../logic';
import type { MoleculeStep } from '../types';

describe('resolveNextStep', () => {
  it('returns the first eligible step when dependencies are met', () => {
    const steps: MoleculeStep[] = [
      {
        id: 'a',
        tenantId: 't1',
        moleculeId: 'm1',
        name: 'alpha',
        status: 'completed',
        dependsOn: [],
        acceptanceCriteria: [],
        createdAt: 'now',
        updatedAt: 'now',
        metadata: {},
      },
      {
        id: 'b',
        tenantId: 't1',
        moleculeId: 'm1',
        name: 'bravo',
        status: 'pending',
        dependsOn: ['a'],
        acceptanceCriteria: [],
        createdAt: 'now',
        updatedAt: 'now',
        metadata: {},
      },
      {
        id: 'c',
        tenantId: 't1',
        moleculeId: 'm1',
        name: 'charlie',
        status: 'pending',
        dependsOn: ['missing'],
        acceptanceCriteria: [],
        createdAt: 'now',
        updatedAt: 'now',
        metadata: {},
      },
    ];

    const next = resolveNextStep(steps);
    expect(next?.id).toEqual('b');
  });

  it('returns null when no steps are eligible', () => {
    const steps: MoleculeStep[] = [
      {
        id: 'a',
        tenantId: 't1',
        moleculeId: 'm1',
        name: 'alpha',
        status: 'running',
        dependsOn: [],
        acceptanceCriteria: [],
        createdAt: 'now',
        updatedAt: 'now',
        metadata: {},
      },
    ];

    expect(resolveNextStep(steps)).toBeNull();
  });
});
