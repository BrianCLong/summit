import { test } from 'node:test';
import assert from 'node:assert';
import { generateSurface } from '../../packages/surfaces/codegen/src/generateSurface.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

test('APS Codegen Security - does not generate code with arbitrary imports or dynamic eval', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aps-codegen-test-'));
  const plan = {
    evidenceId: 'APS-test-plan-001',
    surfaceSlug: 'test-slug',
    panels: []
  };

  await generateSurface(plan, { outDir: tmpDir });

  const generatedCode = fs.readFileSync(path.join(tmpDir, 'test-slug', 'index.tsx'), 'utf-8');

  assert.strictEqual(generatedCode.includes('eval('), false);
  assert.strictEqual(generatedCode.includes('new Function('), false);
  // Ensure the regex strictly matches 'react' and 'react-dom' only.
  assert.strictEqual(/import\s+.*\s+from\s+['"](?!(?:react|react-dom)(?:['"]|[/]))/.test(generatedCode), false);

  fs.rmSync(tmpDir, { recursive: true });
});
