import { describe, it, expect } from 'vitest';
import { TestCaseGenerator } from '../generator/TestCaseGenerator.js';
import { CodeSubmission } from '../types/index.js';

describe('TestCaseGenerator', () => {
  const generator = new TestCaseGenerator();

  describe('generateFromExecution', () => {
    it('should generate golden path test', async () => {
      const submission: CodeSubmission = {
        sandboxId: '123',
        code: 'return inputs.x * 2',
        language: 'javascript',
        entryPoint: 'double',
        inputs: { x: 5 },
        metadata: {},
      };

      const tests = await generator.generateFromExecution(submission, 10);

      const goldenPath = tests.find(t => t.name.includes('Golden Path'));
      expect(goldenPath).toBeDefined();
      expect(goldenPath!.expectedOutput).toBe(10);
      expect(goldenPath!.category).toBe('integration');
    });

    it('should generate edge case tests for string inputs', async () => {
      const submission: CodeSubmission = {
        sandboxId: '123',
        code: 'return inputs.name.toUpperCase()',
        language: 'javascript',
        entryPoint: 'upper',
        inputs: { name: 'test' },
        metadata: {},
      };

      const tests = await generator.generateFromExecution(submission, 'TEST');

      const emptyTest = tests.find(t => t.name.includes('Empty name'));
      expect(emptyTest).toBeDefined();
      expect(emptyTest!.inputs.name).toBe('');
    });

    it('should generate edge case tests for number inputs', async () => {
      const submission: CodeSubmission = {
        sandboxId: '123',
        code: 'return inputs.count + 1',
        language: 'javascript',
        entryPoint: 'increment',
        inputs: { count: 5 },
        metadata: {},
      };

      const tests = await generator.generateFromExecution(submission, 6);

      const zeroTest = tests.find(t => t.name.includes('Zero count'));
      const negativeTest = tests.find(t => t.name.includes('Negative count'));
      const largeTest = tests.find(t => t.name.includes('Large count'));

      expect(zeroTest).toBeDefined();
      expect(negativeTest).toBeDefined();
      expect(largeTest).toBeDefined();
      expect(zeroTest!.inputs.count).toBe(0);
      expect(negativeTest!.inputs.count).toBe(-1);
    });

    it('should generate edge case tests for array inputs', async () => {
      const submission: CodeSubmission = {
        sandboxId: '123',
        code: 'return inputs.items.length',
        language: 'javascript',
        entryPoint: 'count',
        inputs: { items: [1, 2, 3] },
        metadata: {},
      };

      const tests = await generator.generateFromExecution(submission, 3);

      const emptyArrayTest = tests.find(t => t.name.includes('Empty Array items'));
      expect(emptyArrayTest).toBeDefined();
      expect(emptyArrayTest!.inputs.items).toEqual([]);
    });

    it('should generate security tests', async () => {
      const submission: CodeSubmission = {
        sandboxId: '123',
        code: 'return inputs.query',
        language: 'javascript',
        entryPoint: 'search',
        inputs: { query: 'test' },
        metadata: {},
      };

      const tests = await generator.generateFromExecution(submission, 'test');

      const sqlInjection = tests.find(t => t.name.includes('SQL Injection'));
      const xss = tests.find(t => t.name.includes('XSS'));
      const commandInjection = tests.find(t => t.name.includes('Command Injection'));
      const pathTraversal = tests.find(t => t.name.includes('Path Traversal'));

      expect(sqlInjection).toBeDefined();
      expect(xss).toBeDefined();
      expect(commandInjection).toBeDefined();
      expect(pathTraversal).toBeDefined();

      expect(sqlInjection!.category).toBe('security');
      expect(sqlInjection!.inputs.query).toContain('DROP TABLE');
    });

    it('should generate type tests', async () => {
      const submission: CodeSubmission = {
        sandboxId: '123',
        code: 'return { count: inputs.x, name: "result" }',
        language: 'javascript',
        entryPoint: 'transform',
        inputs: { x: 1 },
        metadata: {},
      };

      const output = { count: 1, name: 'result' };
      const tests = await generator.generateFromExecution(submission, output);

      const typeTest = tests.find(t => t.name.includes('Output Structure'));
      expect(typeTest).toBeDefined();
      expect(typeTest!.category).toBe('unit');
    });

    it('should generate null edge case tests', async () => {
      const submission: CodeSubmission = {
        sandboxId: '123',
        code: 'return inputs.data || "default"',
        language: 'javascript',
        entryPoint: 'safe',
        inputs: { data: 'value' },
        metadata: {},
      };

      const tests = await generator.generateFromExecution(submission, 'value');

      const nullTest = tests.find(t => t.name.includes('Null data'));
      expect(nullTest).toBeDefined();
      expect(nullTest!.inputs.data).toBeNull();
    });
  });

  describe('exportAsTestFile', () => {
    it('should generate valid test file code', async () => {
      const submission: CodeSubmission = {
        sandboxId: '123',
        code: 'return inputs.x + 1',
        language: 'javascript',
        entryPoint: 'increment',
        inputs: { x: 1 },
        metadata: {},
      };

      const tests = await generator.generateFromExecution(submission, 2);
      const testFile = generator.exportAsTestFile(tests, 'increment');

      expect(testFile).toContain("import { describe, it, expect } from 'vitest'");
      expect(testFile).toContain('import { increment }');
      expect(testFile).toContain("describe('increment - Auto-Generated Tests'");
      expect(testFile).toContain("it('Golden Path");
    });
  });
});
