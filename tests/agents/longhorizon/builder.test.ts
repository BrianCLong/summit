// tests/agents/longhorizon/builder.test.ts
import { buildStagesFromChain } from '../../../src/agents/longhorizon/builder/build_stages';
import { PRChainRecord } from '../../../src/agents/longhorizon/schema/pr_chain';

describe('Task Builder', () => {
  const record: PRChainRecord = {
    evidence_id: 'LH-123',
    repo: { name: 'test-repo' },
    objective: 'Unified Objective',
    prs: [
      {
        title: 'Initial Feature',
        commits: [{ sha: 's1', message: 'm1', files_changed: [] }],
      },
      {
        title: 'Bugfix',
        bugfix: true,
        commits: [{ sha: 's2', message: 'm2', files_changed: [] }],
      }
    ]
  };

  it('should build stages with unified objective', () => {
    const stagedTask = buildStagesFromChain(record);
    expect(stagedTask.stages).toHaveLength(2);
    expect(stagedTask.stages[0].objective).toBe('Unified Objective');
    expect(stagedTask.stages[1].objective).toBe('Unified Objective');
    expect(stagedTask.stages[1].context.is_bugfix).toBe(true);
  });
});
