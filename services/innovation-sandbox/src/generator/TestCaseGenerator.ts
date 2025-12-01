import { randomUUID } from 'crypto';
import {
  CodeSubmission,
  GeneratedTestCase,
  TestAssertion,
} from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('TestCaseGenerator');

/**
 * TestCaseGenerator automatically creates test cases from sandbox executions
 * to support rapid validation and deployment.
 */
export class TestCaseGenerator {
  /**
   * Generate test cases from a successful execution
   */
  async generateFromExecution(
    submission: CodeSubmission,
    output: unknown
  ): Promise<GeneratedTestCase[]> {
    const testCases: GeneratedTestCase[] = [];

    // 1. Basic execution test (golden path)
    testCases.push(this.createGoldenPathTest(submission, output));

    // 2. Edge case tests
    testCases.push(...this.generateEdgeCases(submission));

    // 3. Security tests
    testCases.push(...this.generateSecurityTests(submission));

    // 4. Type validation tests
    testCases.push(...this.generateTypeTests(submission, output));

    logger.info('Generated test cases', {
      submissionId: submission.sandboxId,
      testCount: testCases.length,
    });

    return testCases;
  }

  /**
   * Create the golden path test matching the successful execution
   */
  private createGoldenPathTest(
    submission: CodeSubmission,
    output: unknown
  ): GeneratedTestCase {
    return {
      id: randomUUID(),
      name: 'Golden Path - Expected Behavior',
      description: `Verifies ${submission.entryPoint} produces expected output with valid inputs`,
      inputs: { ...submission.inputs },
      expectedOutput: output,
      assertions: [
        {
          type: 'equals',
          expected: output,
        },
      ],
      category: 'integration',
    };
  }

  /**
   * Generate edge case tests based on input types
   */
  private generateEdgeCases(submission: CodeSubmission): GeneratedTestCase[] {
    const tests: GeneratedTestCase[] = [];
    const inputs = submission.inputs;

    for (const [key, value] of Object.entries(inputs)) {
      // Null/undefined tests
      tests.push({
        id: randomUUID(),
        name: `Edge Case - Null ${key}`,
        description: `Tests behavior when ${key} is null`,
        inputs: { ...inputs, [key]: null },
        expectedOutput: undefined,
        assertions: [{ type: 'type_check', expected: 'object' }],
        category: 'edge_case',
      });

      // Empty value tests
      if (typeof value === 'string') {
        tests.push({
          id: randomUUID(),
          name: `Edge Case - Empty ${key}`,
          description: `Tests behavior with empty string for ${key}`,
          inputs: { ...inputs, [key]: '' },
          expectedOutput: undefined,
          assertions: [{ type: 'type_check', expected: 'object' }],
          category: 'edge_case',
        });
      }

      if (Array.isArray(value)) {
        tests.push({
          id: randomUUID(),
          name: `Edge Case - Empty Array ${key}`,
          description: `Tests behavior with empty array for ${key}`,
          inputs: { ...inputs, [key]: [] },
          expectedOutput: undefined,
          assertions: [{ type: 'type_check', expected: 'object' }],
          category: 'edge_case',
        });
      }

      if (typeof value === 'number') {
        // Zero test
        tests.push({
          id: randomUUID(),
          name: `Edge Case - Zero ${key}`,
          description: `Tests behavior when ${key} is 0`,
          inputs: { ...inputs, [key]: 0 },
          expectedOutput: undefined,
          assertions: [{ type: 'type_check', expected: 'object' }],
          category: 'edge_case',
        });

        // Negative test
        tests.push({
          id: randomUUID(),
          name: `Edge Case - Negative ${key}`,
          description: `Tests behavior when ${key} is negative`,
          inputs: { ...inputs, [key]: -1 },
          expectedOutput: undefined,
          assertions: [{ type: 'type_check', expected: 'object' }],
          category: 'edge_case',
        });

        // Large number test
        tests.push({
          id: randomUUID(),
          name: `Edge Case - Large ${key}`,
          description: `Tests behavior with large number for ${key}`,
          inputs: { ...inputs, [key]: Number.MAX_SAFE_INTEGER },
          expectedOutput: undefined,
          assertions: [{ type: 'type_check', expected: 'object' }],
          category: 'edge_case',
        });
      }
    }

    return tests;
  }

  /**
   * Generate security-focused tests
   */
  private generateSecurityTests(submission: CodeSubmission): GeneratedTestCase[] {
    const tests: GeneratedTestCase[] = [];
    const inputs = submission.inputs;

    for (const [key, value] of Object.entries(inputs)) {
      if (typeof value === 'string') {
        // SQL injection test
        tests.push({
          id: randomUUID(),
          name: `Security - SQL Injection ${key}`,
          description: `Tests SQL injection resistance for ${key}`,
          inputs: { ...inputs, [key]: "'; DROP TABLE users; --" },
          expectedOutput: undefined,
          assertions: [{ type: 'type_check', expected: 'object' }],
          category: 'security',
        });

        // XSS test
        tests.push({
          id: randomUUID(),
          name: `Security - XSS ${key}`,
          description: `Tests XSS resistance for ${key}`,
          inputs: { ...inputs, [key]: '<script>alert("xss")</script>' },
          expectedOutput: undefined,
          assertions: [{ type: 'type_check', expected: 'object' }],
          category: 'security',
        });

        // Command injection test
        tests.push({
          id: randomUUID(),
          name: `Security - Command Injection ${key}`,
          description: `Tests command injection resistance for ${key}`,
          inputs: { ...inputs, [key]: '; rm -rf /' },
          expectedOutput: undefined,
          assertions: [{ type: 'type_check', expected: 'object' }],
          category: 'security',
        });

        // Path traversal test
        tests.push({
          id: randomUUID(),
          name: `Security - Path Traversal ${key}`,
          description: `Tests path traversal resistance for ${key}`,
          inputs: { ...inputs, [key]: '../../../etc/passwd' },
          expectedOutput: undefined,
          assertions: [{ type: 'type_check', expected: 'object' }],
          category: 'security',
        });
      }
    }

    return tests;
  }

  /**
   * Generate type validation tests based on output structure
   */
  private generateTypeTests(
    submission: CodeSubmission,
    output: unknown
  ): GeneratedTestCase[] {
    const tests: GeneratedTestCase[] = [];

    if (output === null || output === undefined) return tests;

    // Output type test
    tests.push({
      id: randomUUID(),
      name: 'Type - Output Structure',
      description: 'Verifies output maintains expected type structure',
      inputs: { ...submission.inputs },
      expectedOutput: output,
      assertions: this.generateTypeAssertions(output),
      category: 'unit',
    });

    return tests;
  }

  /**
   * Generate type assertions for an output value
   */
  private generateTypeAssertions(
    value: unknown,
    path = ''
  ): TestAssertion[] {
    const assertions: TestAssertion[] = [];

    if (value === null) {
      assertions.push({ type: 'equals', path, expected: null });
      return assertions;
    }

    const type = typeof value;

    if (type === 'object' && !Array.isArray(value)) {
      assertions.push({ type: 'type_check', path, expected: 'object' });

      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        const newPath = path ? `${path}.${key}` : key;
        assertions.push(...this.generateTypeAssertions(val, newPath));
      }
    } else if (Array.isArray(value)) {
      assertions.push({ type: 'type_check', path, expected: 'array' });

      if (value.length > 0) {
        assertions.push(
          ...this.generateTypeAssertions(value[0], `${path}[0]`)
        );
      }
    } else {
      assertions.push({ type: 'type_check', path, expected: type });
    }

    return assertions;
  }

  /**
   * Export test cases as executable test file
   */
  exportAsTestFile(
    testCases: GeneratedTestCase[],
    entryPoint: string
  ): string {
    const imports = `import { describe, it, expect } from 'vitest';
import { ${entryPoint} } from './sandbox-code';

`;

    const tests = testCases.map(tc => `
  it('${tc.name}', async () => {
    const result = await ${entryPoint}(${JSON.stringify(tc.inputs, null, 2)});
    ${this.generateAssertionCode(tc.assertions)}
  });
`).join('\n');

    return `${imports}describe('${entryPoint} - Auto-Generated Tests', () => {
${tests}
});
`;
  }

  private generateAssertionCode(assertions: TestAssertion[]): string {
    return assertions.map(a => {
      switch (a.type) {
        case 'equals':
          return a.path
            ? `expect(result.${a.path}).toEqual(${JSON.stringify(a.expected)});`
            : `expect(result).toEqual(${JSON.stringify(a.expected)});`;
        case 'type_check':
          return a.path
            ? `expect(typeof result.${a.path}).toBe('${a.expected}');`
            : `expect(typeof result).toBe('${a.expected}');`;
        case 'contains':
          return `expect(result).toContain(${JSON.stringify(a.expected)});`;
        case 'throws':
          return `expect(() => result).toThrow();`;
        default:
          return '';
      }
    }).join('\n    ');
  }
}
