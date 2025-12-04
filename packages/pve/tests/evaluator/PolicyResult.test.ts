/**
 * PolicyResult Tests
 */

import { describe, it, expect } from 'vitest';
import {
  PolicyResultBuilder,
  pass,
  fail,
  warn,
  info,
  aggregateResults,
  formatResults,
} from '../../src/evaluator/PolicyResult.js';

describe('PolicyResultBuilder', () => {
  it('should create a passing result', () => {
    const result = PolicyResultBuilder.for('test.policy').allow().build();

    expect(result.policy).toBe('test.policy');
    expect(result.allowed).toBe(true);
  });

  it('should create a failing result', () => {
    const result = PolicyResultBuilder.for('test.policy')
      .deny()
      .asError()
      .message('Something went wrong')
      .build();

    expect(result.policy).toBe('test.policy');
    expect(result.allowed).toBe(false);
    expect(result.severity).toBe('error');
    expect(result.message).toBe('Something went wrong');
  });

  it('should chain all builder methods', () => {
    const result = PolicyResultBuilder.for('test.policy')
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

    expect(result.policy).toBe('test.policy');
    expect(result.allowed).toBe(false);
    expect(result.severity).toBe('warning');
    expect(result.message).toBe('Warning message');
    expect(result.details?.rule).toBe('required-field');
    expect(result.details?.expected).toBe('value');
    expect(result.details?.actual).toBe('actual');
    expect(result.details?.context).toEqual({ key: 'value' });
    expect(result.fix).toBe('Add the required field');
    expect(result.location?.file).toBe('src/test.ts');
    expect(result.location?.line).toBe(42);
    expect(result.location?.field).toBe('name');
  });
});

describe('pass', () => {
  it('should create a passing result', () => {
    const result = pass('test.policy');

    expect(result.policy).toBe('test.policy');
    expect(result.allowed).toBe(true);
  });

  it('should include message when provided', () => {
    const result = pass('test.policy', 'All good');

    expect(result.message).toBe('All good');
  });
});

describe('fail', () => {
  it('should create a failing result with error severity', () => {
    const result = fail('test.policy', 'Error occurred');

    expect(result.policy).toBe('test.policy');
    expect(result.allowed).toBe(false);
    expect(result.severity).toBe('error');
    expect(result.message).toBe('Error occurred');
  });

  it('should accept options', () => {
    const result = fail('test.policy', 'Error occurred', {
      severity: 'warning',
      fix: 'Fix suggestion',
      location: { file: 'test.ts', line: 10 },
      details: { rule: 'test-rule' },
    });

    expect(result.severity).toBe('warning');
    expect(result.fix).toBe('Fix suggestion');
    expect(result.location?.file).toBe('test.ts');
    expect(result.details?.rule).toBe('test-rule');
  });
});

describe('warn', () => {
  it('should create a warning result', () => {
    const result = warn('test.policy', 'Warning message');

    expect(result.allowed).toBe(false);
    expect(result.severity).toBe('warning');
  });
});

describe('info', () => {
  it('should create an info result', () => {
    const result = info('test.policy', 'Info message');

    expect(result.allowed).toBe(false);
    expect(result.severity).toBe('info');
  });
});

describe('aggregateResults', () => {
  it('should aggregate results correctly', () => {
    const results = [
      pass('policy1'),
      pass('policy2'),
      fail('policy3', 'Error', { severity: 'error' }),
      fail('policy4', 'Warning', { severity: 'warning' }),
      fail('policy5', 'Info', { severity: 'info' }),
    ];

    const aggregate = aggregateResults(results);

    expect(aggregate.passed).toBe(false);
    expect(aggregate.total).toBe(5);
    expect(aggregate.passed_count).toBe(2);
    expect(aggregate.failed_count).toBe(3);
    expect(aggregate.errors).toHaveLength(1);
    expect(aggregate.warnings).toHaveLength(1);
    expect(aggregate.infos).toHaveLength(1);
  });

  it('should pass when no errors', () => {
    const results = [
      pass('policy1'),
      fail('policy2', 'Warning', { severity: 'warning' }),
    ];

    const aggregate = aggregateResults(results);

    expect(aggregate.passed).toBe(true);
  });
});

describe('formatResults', () => {
  it('should format results as string', () => {
    const results = [
      pass('policy1'),
      fail('policy2', 'Error message', { severity: 'error' }),
    ];

    const output = formatResults(results, { colors: false });

    expect(output).toContain('policy1');
    expect(output).toContain('policy2');
    expect(output).toContain('Error message');
    expect(output).toContain('Summary');
  });

  it('should include verbose details when requested', () => {
    const results = [
      fail('policy1', 'Error', {
        severity: 'error',
        fix: 'Fix suggestion',
        details: { rule: 'test' },
      }),
    ];

    const output = formatResults(results, { colors: false, verbose: true });

    expect(output).toContain('Fix: Fix suggestion');
    expect(output).toContain('Details:');
  });
});
