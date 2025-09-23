import { enforceBudget } from '../query/QueryBudgetGuard';
import { ensureReadOnly } from '../query/ReadOnlyGuard';

describe('Query guards', () => {
  it('throws when expansions exceed budget', () => {
    expect(() => enforceBudget({ expands: 5 }, { maxMs: 1000, maxRows: 100, maxExpand: 2 })).toThrow('budget_expansion_exceeded');
  });

  it('allows read-only query', () => {
    expect(ensureReadOnly('MATCH (n) RETURN n')).toBe(true);
  });

  it('rejects write query', () => {
    expect(() => ensureReadOnly('CREATE (n)')).toThrow('write_operation_not_allowed');
  });
});
