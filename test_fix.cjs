const fs = require('fs');

const files = [
  'connect/war_cop/__tests__/normalize.test.ts',
  'analysis/war_cop/__tests__/claim_state_machine.test.ts',
  'analysis/war_cop/__tests__/disinfo_heuristics.test.ts',
  'analysis/war_cop/__tests__/render.test.ts',
  'analysis/war_cop/__tests__/snapshot_builder.test.ts',
  'audit/war_cop/__tests__/explain_assertion.test.ts'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  content = content.replace('import { describe, it, expect } from "vitest";', 'import { describe, it } from "node:test";\nimport * as assert from "node:assert";\nconst expect = (actual) => ({ toBe: (expected) => assert.strictEqual(actual, expected), toContain: (expected) => assert.ok(actual.includes(expected)) });\n');
  fs.writeFileSync(f, content, 'utf-8');
});
