import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { analyzeBoundary } from "../scripts/react_boundary_analyzer.ts";
import { validateReactPractices } from "../scripts/react_cache_validator.ts";

function makeTempProject(structure) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "react-practices-"));
  for (const [rel, content] of Object.entries(structure)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, "utf8");
  }
  return root;
}

test("RBP-001 flags server import of client module", () => {
  const root = makeTempProject({
    "app/component.tsx": "'use client';\nexport const Widget = () => null;\n",
    "app/page.tsx":
      "import { Widget } from './component';\nexport default function Page(){ return <Widget />; }\n",
  });

  const result = analyzeBoundary(root);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].ruleId, "RBP-001");
});

test("RBP-002 and RBP-003 are emitted for missing declarations", () => {
  const root = makeTempProject({
    "app/page.tsx":
      "export default async function Page(){ const r = await fetch('https://example.com'); return <div>{String(r.status)}</div>; }\n",
  });

  const result = validateReactPractices(root);
  assert.equal(result.violations.length, 2);
  assert.deepEqual(result.violations.map((v) => v.ruleId).sort(), ["RBP-002", "RBP-003"]);
});

test("cache + streaming compliant route passes", () => {
  const root = makeTempProject({
    "app/loading.tsx": "export default function Loading(){ return <p>Loading</p>; }",
    "app/page.tsx":
      "export const revalidate = 60;\nexport default async function Page(){ await fetch('https://example.com',{ cache: 'force-cache' }); return <div />;}\n",
  });

  const result = validateReactPractices(root);
  assert.equal(result.violations.length, 0);
});
