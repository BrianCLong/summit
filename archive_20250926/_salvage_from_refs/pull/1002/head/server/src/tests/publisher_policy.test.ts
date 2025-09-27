import fs from 'fs';

describe('publisher policy', () => {
  it('defines allow_list rule', () => {
    const rego = fs.readFileSync('server/policies/publisher.rego', 'utf8');
    expect(rego).toMatch(/allow_list/);
  });
});
