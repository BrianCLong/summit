import { parse } from '../../src/dsl';
import { toOPA } from '../../src/compile';

describe('lac compiler', () => {
  it('dsl compiles to rego', () => {
    const rules = parse('permit role:DisclosureApprover export where license != restricted');
    const rego = toOPA(rules);
    expect(rego).toMatch(/package export\.authz/);
    expect(rego).toMatch(/allow/);
  });
});
