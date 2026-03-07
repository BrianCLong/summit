import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateFlows } from '../../src/flows/generate';
import { verifyFlows } from '../../src/flows/verify';
import { createFlowsPack } from '../../src/agents/context/flowsPack';

function fixtureWorkspace(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flows-fixture-'));
  fs.writeFileSync(
    path.join(dir, 'openapi.json'),
    JSON.stringify(
      {
        openapi: '3.0.0',
        paths: {
          '/health': { get: { responses: { '200': { description: 'ok' } } } },
        },
      },
      null,
      2,
    ),
    'utf8',
  );

  fs.writeFileSync(
    path.join(dir, 'sample.asl.json'),
    JSON.stringify(
      {
        Comment: 'workflow-a expectedFinalEvent=event.expected',
        StartAt: 'EndState',
        States: {
          EndState: {
            Type: 'Task',
            End: true,
            Parameters: {
              EventName: 'event.observed',
            },
          },
        },
      },
      null,
      2,
    ),
    'utf8',
  );

  return dir;
}

test('generate creates deterministic flow artifacts and verify+pack output', () => {
  const workspace = fixtureWorkspace();
  const outDir = path.join(workspace, 'docs', 'architecture', 'flows');

  const flows = generateFlows({ workspace, out: outDir });
  assert.ok(flows.length >= 1);
  assert.ok(fs.existsSync(path.join(outDir, 'flows.json')));
  assert.ok(fs.existsSync(path.join(outDir, 'index.md')));

  const verification = verifyFlows({ workspace, out: outDir });
  assert.ok(Array.isArray(verification.unmappedEndpoints));
  assert.ok(Array.isArray(verification.workflowMismatches));
  assert.equal(verification.workflowMismatches.length, 1);

  const packPath = path.join(workspace, '.summit', 'context', 'flows.pack.json');
  const pack = createFlowsPack(outDir, packPath);
  assert.ok(fs.existsSync(packPath));
  assert.equal(pack.flowCount, flows.length);
});
