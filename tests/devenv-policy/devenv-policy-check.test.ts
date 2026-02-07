import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { scanDevenvPolicy } from '../../.github/scripts/devenv-policy-check.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, '../fixtures/devenv-policy');
const policyPath = path.resolve(
  __dirname,
  '../../.github/policies/devenv-policy.json',
);

async function createTempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'devenv-policy-'));
}

async function writeFixture(fixtureName: string, destination: string) {
  const content = await fs.readFile(path.join(fixturesDir, fixtureName), 'utf8');
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, content, 'utf8');
}

test('detects devcontainer lifecycle command', async () => {
  const rootDir = await createTempRoot();
  await writeFixture(
    'bad-devcontainer.json',
    path.join(rootDir, '.devcontainer', 'devcontainer.json'),
  );

  const result = scanDevenvPolicy({ rootDir, policyPath });
  expect(result.decision).toBe('fail');
  expect(result.findings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'DEVCONTAINER_LIFECYCLE',
        match: 'postCreateCommand',
      }),
    ]),
  );
});

test('detects VS Code task autorun', async () => {
  const rootDir = await createTempRoot();
  await writeFixture(
    'bad-tasks.json',
    path.join(rootDir, '.vscode', 'tasks.json'),
  );

  const result = scanDevenvPolicy({ rootDir, policyPath });
  expect(result.decision).toBe('fail');
  expect(result.findings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'VSCODE_TASKS_AUTORUN',
        match: 'folderOpen',
      }),
    ]),
  );
});

test('detects PROMPT_COMMAND injection', async () => {
  const rootDir = await createTempRoot();
  await writeFixture(
    'bad-settings.json',
    path.join(rootDir, '.vscode', 'settings.json'),
  );

  const result = scanDevenvPolicy({ rootDir, policyPath });
  expect(result.decision).toBe('fail');
  expect(result.findings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'VSCODE_PROMPT_COMMAND',
        match: 'PROMPT_COMMAND',
      }),
    ]),
  );
});

test('passes safe configuration files', async () => {
  const rootDir = await createTempRoot();
  await writeFixture(
    'safe-devcontainer.json',
    path.join(rootDir, '.devcontainer', 'devcontainer.json'),
  );
  await writeFixture(
    'safe-tasks.json',
    path.join(rootDir, '.vscode', 'tasks.json'),
  );
  await writeFixture(
    'safe-settings.json',
    path.join(rootDir, '.vscode', 'settings.json'),
  );

  const result = scanDevenvPolicy({ rootDir, policyPath });
  expect(result.decision).toBe('pass');
  expect(result.findings).toHaveLength(0);
});

test('applies a valid exception to suppress findings', async () => {
  const rootDir = await createTempRoot();
  await writeFixture(
    'bad-devcontainer.json',
    path.join(rootDir, '.devcontainer', 'devcontainer.json'),
  );

  const exceptionsPath = path.join(rootDir, 'devenv-exceptions.json');
  await fs.writeFile(
    exceptionsPath,
    JSON.stringify(
      {
        version: 1,
        exceptions: [
          {
            id: 'EXCEPTION-ALLOWED-0001',
            paths: ['.devcontainer/devcontainer.json'],
            keys: ['postCreateCommand'],
            owner: 'devex@example.com',
            reason: 'Temporary bootstrap script while migrating.',
            expiresOn: '2099-01-01',
            evidenceIds: ['EVD-THREATSDAY-CODESPACES-RCE-TEST-002'],
          },
        ],
      },
      null,
      2,
    ),
    'utf8',
  );

  const result = scanDevenvPolicy({
    rootDir,
    policyPath,
    exceptionsPath,
  });

  expect(result.decision).toBe('pass');
  expect(result.findings).toHaveLength(0);
  expect(result.exceptionsApplied).toEqual([
    {
      id: 'EXCEPTION-ALLOWED-0001',
      path: '.devcontainer/devcontainer.json',
      ruleId: 'DEVCONTAINER_LIFECYCLE',
      match: 'postCreateCommand',
    },
  ]);
});
