
import { OpenAPIGenerator } from '../../../tooling/openapi/generator';
import { BreakingChangeDetector } from '../../../tooling/openapi/breaking-change-detector';
import fs from 'fs';
import path from 'path';

describe('Schema Contract Testing', () => {
  const baselinePath = path.resolve(__dirname, 'openapi-baseline.json');

  beforeAll(() => {
    // Ensure we have a baseline for the test
    if (!fs.existsSync(baselinePath)) {
        OpenAPIGenerator.saveSpec(baselinePath);
    }
  });

  afterAll(() => {
    // Cleanup if needed, but keeping baseline is often desired
    if (fs.existsSync(baselinePath)) {
        fs.unlinkSync(baselinePath);
    }
  });

  it('should match the snapshot', () => {
    const currentSpec = OpenAPIGenerator.generateSpec();
    const baselineSpec = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));

    expect(currentSpec).toEqual(baselineSpec);
  });

  it('should detect breaking changes', () => {
    // Mock the generator to simulate a breaking change
    const originalGenerate = OpenAPIGenerator.generateSpec;
    OpenAPIGenerator.generateSpec = jest.fn(() => ({
      openapi: '3.0.0',
      info: { title: 'Broken API', version: '2.0.0' },
      paths: {
        // '/v1/health' is REMOVED
      }
    }));

    const errors = BreakingChangeDetector.detect(baselinePath);
    expect(errors.length).toBeGreaterThan(0); // Should have "Path removed" errors
    expect(errors[0]).toContain('Path removed');

    // Restore
    OpenAPIGenerator.generateSpec = originalGenerate;
  });
});
