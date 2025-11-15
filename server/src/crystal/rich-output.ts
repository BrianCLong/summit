import type { JSONRecord, RichOutputPayload } from './types.js';

export interface TestReport {
  summary: {
    passed: number;
    failed: number;
    skipped: number;
    durationMs: number;
  };
  cases: Array<{
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    durationMs: number;
    message?: string;
  }>;
}

export function toRichOutput(data: JSONRecord | TestReport): RichOutputPayload {
  if (isTestReport(data)) {
    return {
      kind: 'test-report',
      title: 'Test Execution Report',
      data: data as any,
    };
  }
  if ('rows' in data && 'headers' in data) {
    return {
      kind: 'table',
      data,
    };
  }
  if ('mermaid' in data) {
    return {
      kind: 'diagram',
      data,
    };
  }
  return {
    kind: 'markdown',
    data,
  };
}

function isTestReport(value: JSONRecord | TestReport): value is TestReport {
  const maybe = value as TestReport;
  return (
    typeof maybe?.summary?.passed === 'number' &&
    typeof maybe?.summary?.failed === 'number' &&
    Array.isArray(maybe?.cases)
  );
}
