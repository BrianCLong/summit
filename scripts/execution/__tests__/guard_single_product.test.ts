import { describe, it, expect } from 'vitest';
import { validateFiles, Config } from '../guard_single_product.js'; // Using .js extension for ESM imports

describe('Single Product Guardrail', () => {
  const config: Config = {
    active_product: 'factflow',
    frozen_products: ['factlaw', 'factmarkets', 'factapi'],
    allowed_paths_always: ['docs/', 'scripts/', 'config/'],
    override_file: '.exec-override'
  };

  it('should pass for allowed paths', () => {
    const files = ['docs/README.md', 'scripts/test.ts', 'config/settings.json'];
    const violations = validateFiles(files, config);
    expect(violations).toEqual([]);
  });

  it('should pass for active product files', () => {
    const files = ['server/src/factflow/api.ts'];
    // Assuming "factflow" is NOT in frozen_products, so it shouldn't trigger violation.
    // The logic checks if path segment matches ANY frozen product.
    const violations = validateFiles(files, config);
    expect(violations).toEqual([]);
  });

  it('should fail for frozen product files', () => {
    const files = ['packages/factlaw/src/index.ts'];
    const violations = validateFiles(files, config);
    expect(violations).toEqual(['packages/factlaw/src/index.ts']);
  });

  it('should fail for multiple frozen product files', () => {
    const files = ['packages/factlaw/src/index.ts', 'factmarkets/report.json'];
    const violations = validateFiles(files, config);
    expect(violations).toHaveLength(2);
    expect(violations).toContain('packages/factlaw/src/index.ts');
    expect(violations).toContain('factmarkets/report.json');
  });

  it('should handle nested paths correctly', () => {
      const files = ['some/deep/path/factapi/file.ts'];
      const violations = validateFiles(files, config);
      expect(violations).toEqual(['some/deep/path/factapi/file.ts']);
  });

  it('should allow files that do not match frozen products', () => {
      const files = ['some/other/feature.ts'];
      const violations = validateFiles(files, config);
      expect(violations).toEqual([]);
  });
});
