
import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('API Contract Compliance', () => {
  const specPath = path.resolve(__dirname, '../../../docs/api-spec.yaml');

  it('should have a valid OpenAPI spec file', () => {
    expect(fs.existsSync(specPath)).toBe(true);
    const specContent = fs.readFileSync(specPath, 'utf8');
    expect(specContent).toContain('openapi: 3.0.0');
    expect(specContent).toContain('info:');
    expect(specContent).toContain('paths:');
  });

  it('should document critical endpoints', () => {
    const specContent = fs.readFileSync(specPath, 'utf8');

    // Simple regex check for critical paths to ensure they are documented
    // This is a robust "Contract Freeze" check: if these disappear from docs, test fails.
    expect(specContent).toMatch(/\/health:/);
    expect(specContent).toMatch(/\/api\/maestro\/runs:/);

    // We can also verify version is pinned
    expect(specContent).toMatch(/version: 1\.0\.0/);
  });
});
