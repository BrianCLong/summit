"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const TestCaseGenerator_js_1 = require("../generator/TestCaseGenerator.js");
(0, vitest_1.describe)('TestCaseGenerator', () => {
    const generator = new TestCaseGenerator_js_1.TestCaseGenerator();
    (0, vitest_1.describe)('generateFromExecution', () => {
        (0, vitest_1.it)('should generate golden path test', async () => {
            const submission = {
                sandboxId: '123',
                code: 'return inputs.x * 2',
                language: 'javascript',
                entryPoint: 'double',
                inputs: { x: 5 },
                metadata: {},
            };
            const tests = await generator.generateFromExecution(submission, 10);
            const goldenPath = tests.find(t => t.name.includes('Golden Path'));
            (0, vitest_1.expect)(goldenPath).toBeDefined();
            (0, vitest_1.expect)(goldenPath.expectedOutput).toBe(10);
            (0, vitest_1.expect)(goldenPath.category).toBe('integration');
        });
        (0, vitest_1.it)('should generate edge case tests for string inputs', async () => {
            const submission = {
                sandboxId: '123',
                code: 'return inputs.name.toUpperCase()',
                language: 'javascript',
                entryPoint: 'upper',
                inputs: { name: 'test' },
                metadata: {},
            };
            const tests = await generator.generateFromExecution(submission, 'TEST');
            const emptyTest = tests.find(t => t.name.includes('Empty name'));
            (0, vitest_1.expect)(emptyTest).toBeDefined();
            (0, vitest_1.expect)(emptyTest.inputs.name).toBe('');
        });
        (0, vitest_1.it)('should generate edge case tests for number inputs', async () => {
            const submission = {
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
            (0, vitest_1.expect)(zeroTest).toBeDefined();
            (0, vitest_1.expect)(negativeTest).toBeDefined();
            (0, vitest_1.expect)(largeTest).toBeDefined();
            (0, vitest_1.expect)(zeroTest.inputs.count).toBe(0);
            (0, vitest_1.expect)(negativeTest.inputs.count).toBe(-1);
        });
        (0, vitest_1.it)('should generate edge case tests for array inputs', async () => {
            const submission = {
                sandboxId: '123',
                code: 'return inputs.items.length',
                language: 'javascript',
                entryPoint: 'count',
                inputs: { items: [1, 2, 3] },
                metadata: {},
            };
            const tests = await generator.generateFromExecution(submission, 3);
            const emptyArrayTest = tests.find(t => t.name.includes('Empty Array items'));
            (0, vitest_1.expect)(emptyArrayTest).toBeDefined();
            (0, vitest_1.expect)(emptyArrayTest.inputs.items).toEqual([]);
        });
        (0, vitest_1.it)('should generate security tests', async () => {
            const submission = {
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
            (0, vitest_1.expect)(sqlInjection).toBeDefined();
            (0, vitest_1.expect)(xss).toBeDefined();
            (0, vitest_1.expect)(commandInjection).toBeDefined();
            (0, vitest_1.expect)(pathTraversal).toBeDefined();
            (0, vitest_1.expect)(sqlInjection.category).toBe('security');
            (0, vitest_1.expect)(sqlInjection.inputs.query).toContain('DROP TABLE');
        });
        (0, vitest_1.it)('should generate type tests', async () => {
            const submission = {
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
            (0, vitest_1.expect)(typeTest).toBeDefined();
            (0, vitest_1.expect)(typeTest.category).toBe('unit');
        });
        (0, vitest_1.it)('should generate null edge case tests', async () => {
            const submission = {
                sandboxId: '123',
                code: 'return inputs.data || "default"',
                language: 'javascript',
                entryPoint: 'safe',
                inputs: { data: 'value' },
                metadata: {},
            };
            const tests = await generator.generateFromExecution(submission, 'value');
            const nullTest = tests.find(t => t.name.includes('Null data'));
            (0, vitest_1.expect)(nullTest).toBeDefined();
            (0, vitest_1.expect)(nullTest.inputs.data).toBeNull();
        });
    });
    (0, vitest_1.describe)('exportAsTestFile', () => {
        (0, vitest_1.it)('should generate valid test file code', async () => {
            const submission = {
                sandboxId: '123',
                code: 'return inputs.x + 1',
                language: 'javascript',
                entryPoint: 'increment',
                inputs: { x: 1 },
                metadata: {},
            };
            const tests = await generator.generateFromExecution(submission, 2);
            const testFile = generator.exportAsTestFile(tests, 'increment');
            (0, vitest_1.expect)(testFile).toContain("import { describe, it, expect } from 'vitest'");
            (0, vitest_1.expect)(testFile).toContain('import { increment }');
            (0, vitest_1.expect)(testFile).toContain("describe('increment - Auto-Generated Tests'");
            (0, vitest_1.expect)(testFile).toContain("it('Golden Path");
        });
    });
});
