import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { doctor, runSpec } from '../../scripts/playwright-cli-runner.mjs';

const originalFlag = process.env.SUMMIT_ENABLE_PLAYWRIGHT_CLI;

test('doctor returns structured output', async () => {
  const result = await doctor({
    exec: async () => ({ code: 0, stdout: 'playwright-cli 0.0.0-test', stderr: '' }),
  });

  assert.equal(result.status, 'ok');
  assert.equal(result.version_stdout, 'playwright-cli 0.0.0-test');
});

test('runSpec rejects shell metacharacters', async () => {
  process.env.SUMMIT_ENABLE_PLAYWRIGHT_CLI = '1';
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pwcli-'));
  const specPath = path.join(tmp, 'bad.json');
  await fs.writeFile(
    specPath,
    JSON.stringify({
      name: 'bad',
      startUrl: 'https://demo.playwright.dev/todomvc',
      allowedDomains: ['demo.playwright.dev'],
      steps: [{ action: 'type', target: 'input.new-todo', value: 'ok;rm -rf /' }],
    }),
  );

  await assert.rejects(() => runSpec({ specPath }), /forbidden shell metacharacters/);
});

test('runSpec produces deterministic run id and report', async () => {
  process.env.SUMMIT_ENABLE_PLAYWRIGHT_CLI = '1';
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pwcli-'));
  const specPath = path.join(tmp, 'spec.json');
  await fs.writeFile(
    specPath,
    JSON.stringify({
      name: 'good',
      startUrl: 'https://demo.playwright.dev/todomvc?token=redact',
      allowedDomains: ['demo.playwright.dev'],
      steps: [
        { action: 'open', target: 'https://demo.playwright.dev/todomvc' },
        { action: 'check', target: 'text=ok' },
      ],
    }),
  );

  const exec = async () => ({ code: 0, stdout: 'ok', stderr: '' });
  const first = await runSpec({ specPath, outRoot: path.join(tmp, 'out'), exec });
  const second = await runSpec({ specPath, outRoot: path.join(tmp, 'out'), exec });

  assert.equal(first.run_id, second.run_id);
  assert.equal(first.report.start_url.includes('?'), false);

  const reportPath = path.join(first.run_dir, 'report.json');
  const report = await fs.readFile(reportPath, 'utf8');
  assert.match(report, /"run_id"/);
});

test.after(() => {
  process.env.SUMMIT_ENABLE_PLAYWRIGHT_CLI = originalFlag;
});
