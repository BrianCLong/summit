"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
const SIGNING_SECRET = 'test-secret';
function buildSubmission(code, tenantId = 'tenantA') {
    return {
        tenantId,
        code,
        metadata: {
            name: 'test udf',
            version: '1.0.0',
        },
    };
}
(0, vitest_1.describe)('Secure UDF Marketplace pipeline', () => {
    (0, vitest_1.it)('rejects usage of banned globals during static analysis', () => {
        const submission = buildSubmission('module.exports = () => process.exit(0);');
        const result = (0, index_js_1.performStaticAnalysis)(submission);
        (0, vitest_1.expect)(result.passed).toBe(false);
        (0, vitest_1.expect)(result.issues.some((issue) => issue.rule === 'process-access')).toBe(true);
    });
    (0, vitest_1.it)('accepts and certifies a safe submission deterministically', async () => {
        const code = `export default function handler(runtimeInput) {
      const values = Array.isArray(runtimeInput?.values) ? runtimeInput.values : [];
      const total = values.filter((n) => typeof n === 'number').reduce((sum, value) => sum + value, 0);
      return { total };
    }`;
        const submission = buildSubmission(code);
        const first = await (0, index_js_1.evaluateSubmission)(submission, { signingSecret: SIGNING_SECRET });
        const second = await (0, index_js_1.evaluateSubmission)(submission, { signingSecret: SIGNING_SECRET });
        (0, vitest_1.expect)(first.accepted).toBe(true);
        (0, vitest_1.expect)(second.accepted).toBe(true);
        (0, vitest_1.expect)(first.artifact.signature).toBe(second.artifact.signature);
        (0, vitest_1.expect)(first.artifact.rating.rating).toBe('low-risk');
    });
    (0, vitest_1.it)('enforces runtime quotas for large buffer allocations', async () => {
        const submission = buildSubmission(`module.exports = () => {
      const buf = Buffer.alloc(1024 * 1024);
      return buf.length;
    };`);
        const result = await (0, index_js_1.evaluateSubmission)(submission, { signingSecret: SIGNING_SECRET });
        (0, vitest_1.expect)(result.accepted).toBe(false);
        (0, vitest_1.expect)(result.artifact.sandbox.status).toBe('quota-exceeded');
    });
    (0, vitest_1.it)('blocks network access to non-allowlisted hosts inside the sandbox', async () => {
        const submission = buildSubmission(`module.exports = async () => {
      await fetch('https://example.com/api');
      return true;
    };`);
        const result = await (0, index_js_1.evaluateSubmission)(submission, { signingSecret: SIGNING_SECRET });
        (0, vitest_1.expect)(result.accepted).toBe(false);
        (0, vitest_1.expect)(result.artifact.sandbox.status).toBe('quota-exceeded');
        (0, vitest_1.expect)(result.artifact.sandbox.error).toContain('allowlist');
    });
    (0, vitest_1.it)('flags seeded sandbox escape attempts that invoke require', async () => {
        const submission = buildSubmission(`module.exports = () => {
      const fs = require('fs');
      return fs.readFileSync('/etc/passwd').toString();
    };`);
        const result = await (0, index_js_1.evaluateSubmission)(submission, { signingSecret: SIGNING_SECRET });
        (0, vitest_1.expect)(result.accepted).toBe(false);
        (0, vitest_1.expect)(result.artifact.analysis.passed).toBe(false);
        (0, vitest_1.expect)(result.artifact.analysis.issues.some((issue) => issue.rule === 'banned-module')).toBe(true);
    });
});
