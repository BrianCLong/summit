"use strict";
/**
 * PolicyResult Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const PolicyResult_js_1 = require("../../src/evaluator/PolicyResult.js");
(0, vitest_1.describe)('PolicyResultBuilder', () => {
    (0, vitest_1.it)('should create a passing result', () => {
        const result = PolicyResult_js_1.PolicyResultBuilder.for('test.policy').allow().build();
        (0, vitest_1.expect)(result.policy).toBe('test.policy');
        (0, vitest_1.expect)(result.allowed).toBe(true);
    });
    (0, vitest_1.it)('should create a failing result', () => {
        const result = PolicyResult_js_1.PolicyResultBuilder.for('test.policy')
            .deny()
            .asError()
            .message('Something went wrong')
            .build();
        (0, vitest_1.expect)(result.policy).toBe('test.policy');
        (0, vitest_1.expect)(result.allowed).toBe(false);
        (0, vitest_1.expect)(result.severity).toBe('error');
        (0, vitest_1.expect)(result.message).toBe('Something went wrong');
    });
    (0, vitest_1.it)('should chain all builder methods', () => {
        const result = PolicyResult_js_1.PolicyResultBuilder.for('test.policy')
            .deny()
            .asWarning()
            .message('Warning message')
            .rule('required-field')
            .expected('value', 'actual')
            .context({ key: 'value' })
            .fix('Add the required field')
            .file('src/test.ts')
            .line(42)
            .field('name')
            .build();
        (0, vitest_1.expect)(result.policy).toBe('test.policy');
        (0, vitest_1.expect)(result.allowed).toBe(false);
        (0, vitest_1.expect)(result.severity).toBe('warning');
        (0, vitest_1.expect)(result.message).toBe('Warning message');
        (0, vitest_1.expect)(result.details?.rule).toBe('required-field');
        (0, vitest_1.expect)(result.details?.expected).toBe('value');
        (0, vitest_1.expect)(result.details?.actual).toBe('actual');
        (0, vitest_1.expect)(result.details?.context).toEqual({ key: 'value' });
        (0, vitest_1.expect)(result.fix).toBe('Add the required field');
        (0, vitest_1.expect)(result.location?.file).toBe('src/test.ts');
        (0, vitest_1.expect)(result.location?.line).toBe(42);
        (0, vitest_1.expect)(result.location?.field).toBe('name');
    });
});
(0, vitest_1.describe)('pass', () => {
    (0, vitest_1.it)('should create a passing result', () => {
        const result = (0, PolicyResult_js_1.pass)('test.policy');
        (0, vitest_1.expect)(result.policy).toBe('test.policy');
        (0, vitest_1.expect)(result.allowed).toBe(true);
    });
    (0, vitest_1.it)('should include message when provided', () => {
        const result = (0, PolicyResult_js_1.pass)('test.policy', 'All good');
        (0, vitest_1.expect)(result.message).toBe('All good');
    });
});
(0, vitest_1.describe)('fail', () => {
    (0, vitest_1.it)('should create a failing result with error severity', () => {
        const result = (0, PolicyResult_js_1.fail)('test.policy', 'Error occurred');
        (0, vitest_1.expect)(result.policy).toBe('test.policy');
        (0, vitest_1.expect)(result.allowed).toBe(false);
        (0, vitest_1.expect)(result.severity).toBe('error');
        (0, vitest_1.expect)(result.message).toBe('Error occurred');
    });
    (0, vitest_1.it)('should accept options', () => {
        const result = (0, PolicyResult_js_1.fail)('test.policy', 'Error occurred', {
            severity: 'warning',
            fix: 'Fix suggestion',
            location: { file: 'test.ts', line: 10 },
            details: { rule: 'test-rule' },
        });
        (0, vitest_1.expect)(result.severity).toBe('warning');
        (0, vitest_1.expect)(result.fix).toBe('Fix suggestion');
        (0, vitest_1.expect)(result.location?.file).toBe('test.ts');
        (0, vitest_1.expect)(result.details?.rule).toBe('test-rule');
    });
});
(0, vitest_1.describe)('warn', () => {
    (0, vitest_1.it)('should create a warning result', () => {
        const result = (0, PolicyResult_js_1.warn)('test.policy', 'Warning message');
        (0, vitest_1.expect)(result.allowed).toBe(false);
        (0, vitest_1.expect)(result.severity).toBe('warning');
    });
});
(0, vitest_1.describe)('info', () => {
    (0, vitest_1.it)('should create an info result', () => {
        const result = (0, PolicyResult_js_1.info)('test.policy', 'Info message');
        (0, vitest_1.expect)(result.allowed).toBe(false);
        (0, vitest_1.expect)(result.severity).toBe('info');
    });
});
(0, vitest_1.describe)('aggregateResults', () => {
    (0, vitest_1.it)('should aggregate results correctly', () => {
        const results = [
            (0, PolicyResult_js_1.pass)('policy1'),
            (0, PolicyResult_js_1.pass)('policy2'),
            (0, PolicyResult_js_1.fail)('policy3', 'Error', { severity: 'error' }),
            (0, PolicyResult_js_1.fail)('policy4', 'Warning', { severity: 'warning' }),
            (0, PolicyResult_js_1.fail)('policy5', 'Info', { severity: 'info' }),
        ];
        const aggregate = (0, PolicyResult_js_1.aggregateResults)(results);
        (0, vitest_1.expect)(aggregate.passed).toBe(false);
        (0, vitest_1.expect)(aggregate.total).toBe(5);
        (0, vitest_1.expect)(aggregate.passed_count).toBe(2);
        (0, vitest_1.expect)(aggregate.failed_count).toBe(3);
        (0, vitest_1.expect)(aggregate.errors).toHaveLength(1);
        (0, vitest_1.expect)(aggregate.warnings).toHaveLength(1);
        (0, vitest_1.expect)(aggregate.infos).toHaveLength(1);
    });
    (0, vitest_1.it)('should pass when no errors', () => {
        const results = [
            (0, PolicyResult_js_1.pass)('policy1'),
            (0, PolicyResult_js_1.fail)('policy2', 'Warning', { severity: 'warning' }),
        ];
        const aggregate = (0, PolicyResult_js_1.aggregateResults)(results);
        (0, vitest_1.expect)(aggregate.passed).toBe(true);
    });
});
(0, vitest_1.describe)('formatResults', () => {
    (0, vitest_1.it)('should format results as string', () => {
        const results = [
            (0, PolicyResult_js_1.pass)('policy1'),
            (0, PolicyResult_js_1.fail)('policy2', 'Error message', { severity: 'error' }),
        ];
        const output = (0, PolicyResult_js_1.formatResults)(results, { colors: false });
        (0, vitest_1.expect)(output).toContain('policy1');
        (0, vitest_1.expect)(output).toContain('policy2');
        (0, vitest_1.expect)(output).toContain('Error message');
        (0, vitest_1.expect)(output).toContain('Summary');
    });
    (0, vitest_1.it)('should include verbose details when requested', () => {
        const results = [
            (0, PolicyResult_js_1.fail)('policy1', 'Error', {
                severity: 'error',
                fix: 'Fix suggestion',
                details: { rule: 'test' },
            }),
        ];
        const output = (0, PolicyResult_js_1.formatResults)(results, { colors: false, verbose: true });
        (0, vitest_1.expect)(output).toContain('Fix: Fix suggestion');
        (0, vitest_1.expect)(output).toContain('Details:');
    });
});
