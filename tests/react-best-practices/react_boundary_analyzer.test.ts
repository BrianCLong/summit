import { analyze } from '../../scripts/react-best-practices/react_boundary_analyzer';
import { validateCache } from '../../scripts/react-best-practices/react_cache_validator';
import * as path from 'path';

describe('React Best Practices Analyzer', () => {
  const fixturesDir = path.join(__dirname, '../fixtures/react-best-practices');

  it('should detect boundary violations', () => {
    const violations = analyze(path.join(fixturesDir, 'malicious_import'));
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].ruleId).toBe('RBP-001');
    expect(violations[0].importPath).toBe('./client-comp');
  });

  it('should detect cache and streaming violations', () => {
    const violations = validateCache(path.join(fixturesDir, 'cache_regression'));
    expect(violations.length).toBe(2);

    const ruleIds = violations.map(v => v.ruleId);
    expect(ruleIds).toContain('RBP-002');
    expect(ruleIds).toContain('RBP-003');
  });
});
