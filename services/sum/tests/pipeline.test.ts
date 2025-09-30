import { describe, expect, it } from 'vitest';
import { evaluateSubmission, performStaticAnalysis } from '../src/index.js';
import type { UdfSubmission } from '../src/types.js';

const SIGNING_SECRET = 'test-secret';

function buildSubmission(code: string, tenantId = 'tenantA'): UdfSubmission {
  return {
    tenantId,
    code,
    metadata: {
      name: 'test udf',
      version: '1.0.0',
    },
  };
}

describe('Secure UDF Marketplace pipeline', () => {
  it('rejects usage of banned globals during static analysis', () => {
    const submission = buildSubmission('module.exports = () => process.exit(0);');
    const result = performStaticAnalysis(submission);
    expect(result.passed).toBe(false);
    expect(result.issues.some((issue) => issue.rule === 'process-access')).toBe(true);
  });

  it('accepts and certifies a safe submission deterministically', async () => {
    const code = `export default function handler(runtimeInput) {
      const values = Array.isArray(runtimeInput?.values) ? runtimeInput.values : [];
      const total = values.filter((n) => typeof n === 'number').reduce((sum, value) => sum + value, 0);
      return { total };
    }`;
    const submission = buildSubmission(code);
    const first = await evaluateSubmission(submission, { signingSecret: SIGNING_SECRET });
    const second = await evaluateSubmission(submission, { signingSecret: SIGNING_SECRET });

    expect(first.accepted).toBe(true);
    expect(second.accepted).toBe(true);
    expect(first.artifact.signature).toBe(second.artifact.signature);
    expect(first.artifact.rating.rating).toBe('low-risk');
  });

  it('enforces runtime quotas for large buffer allocations', async () => {
    const submission = buildSubmission(`module.exports = () => {
      const buf = Buffer.alloc(1024 * 1024);
      return buf.length;
    };`);
    const result = await evaluateSubmission(submission, { signingSecret: SIGNING_SECRET });
    expect(result.accepted).toBe(false);
    expect(result.artifact.sandbox.status).toBe('quota-exceeded');
  });

  it('blocks network access to non-allowlisted hosts inside the sandbox', async () => {
    const submission = buildSubmission(`module.exports = async () => {
      await fetch('https://example.com/api');
      return true;
    };`);
    const result = await evaluateSubmission(submission, { signingSecret: SIGNING_SECRET });
    expect(result.accepted).toBe(false);
    expect(result.artifact.sandbox.status).toBe('quota-exceeded');
    expect(result.artifact.sandbox.error).toContain('allowlist');
  });

  it('flags seeded sandbox escape attempts that invoke require', async () => {
    const submission = buildSubmission(`module.exports = () => {
      const fs = require('fs');
      return fs.readFileSync('/etc/passwd').toString();
    };`);
    const result = await evaluateSubmission(submission, { signingSecret: SIGNING_SECRET });
    expect(result.accepted).toBe(false);
    expect(result.artifact.analysis.passed).toBe(false);
    expect(result.artifact.analysis.issues.some((issue) => issue.rule === 'banned-module')).toBe(true);
  });
});
