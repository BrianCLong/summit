import * as fs from 'fs';
import * as path from 'path';

describe('Deny by Default Policy Fixture', () => {
  it('should have a default deny policy', () => {
    const policyPath = path.join(process.cwd(), '.github', 'policies', 'infra', 'deny-by-default.rego');
    const policyContent = fs.readFileSync(policyPath, 'utf8');

    expect(policyContent).toContain('default allow = false');
  });
});
