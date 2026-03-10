const fs = require('fs');
const glob = require('glob');

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
  if (!content.includes('import { describe, it, expect } from "vitest";')) {
    content = 'import { describe, it, expect } from "vitest";\n' + content;
    fs.writeFileSync(f, content, 'utf-8');
  }
});
