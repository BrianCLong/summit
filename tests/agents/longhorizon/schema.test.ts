// tests/agents/longhorizon/schema.test.ts
import { validatePRChain } from '../../../src/agents/longhorizon/schema/validate';
import { normalizePRChain } from '../../../src/agents/longhorizon/schema/pr_chain';

describe('PRChain Schema', () => {
  const validRecord = {
    repo: { name: 'test-repo' },
    objective: 'Test objective',
    prs: [
      {
        title: 'PR 1',
        commits: [
          {
            sha: 'abc',
            message: 'initial commit',
            files_changed: [{ path: 'file1.ts', additions: 10, deletions: 0 }]
          }
        ]
      }
    ]
  };

  it('should validate a valid record', () => {
    const validated = validatePRChain(validRecord);
    expect(validated.repo.name).toBe('test-repo');
    expect(validated.prs).toHaveLength(1);
  });

  it('should throw on invalid record', () => {
    const invalidRecord = { ...validRecord, repo: {} };
    expect(() => validatePRChain(invalidRecord)).toThrow();
  });

  it('should normalize a record deterministically', () => {
    const record = {
      repo: { name: 'test-repo' },
      objective: ' Test objective ',
      prs: [
        {
          title: ' PR 1 ',
          bugfix: true,
          commits: [
            {
              sha: 'abc',
              message: ' commit ',
              files_changed: [
                { path: 'b.ts', additions: 1, deletions: 1 },
                { path: 'a.ts', additions: 1, deletions: 1 }
              ]
            }
          ]
        }
      ]
    };

    const normalized = normalizePRChain(record);
    expect(normalized.objective).toBe('Test objective');
    expect(normalized.prs[0].title).toBe('PR 1');
    expect(normalized.prs[0].commits[0].files_changed[0].path).toBe('a.ts');
    expect(normalized.prs[0].commits[0].files_changed[1].path).toBe('b.ts');
  });
});
