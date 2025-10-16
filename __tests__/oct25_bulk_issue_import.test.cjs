/* eslint-disable no-console */
const path = require('path');
const fs = require('fs-extra');
const tmp = require('tmp');
const nock = require('nock');
const { execa } = require('execa');

const API_BASE = 'https://api.github.com';
const TARGET = process.env.FILENAME || 'scripts/oct25_bulk_issue_import.cjs';

const makeBatch = (dir, index, { start = 1, count = 5 } = {}) => {
  const records = [];
  for (let i = 0; i < count; i += 1) {
    const n = start + i;
    records.push({
      title: `e2e_batch_${index}_issue_${n}`,
      body: `body ${n}`,
      labels: ['program/release-train', 'type/chore'],
      assignees: ['BrianCLong'],
      state: 'open',
      filePath: `project/file_${index}_${n}.md`,
    });
  }
  const filePath = path.join(
    dir,
    `batch_${String(index).padStart(4, '0')}.json`,
  );
  fs.writeJsonSync(filePath, records, { spaces: 2 });
  return { filePath, records };
};

const csvEscape = (value) => {
  const normalized = String(value ?? '');
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
};

const writeCsv = (destination, records) => {
  const header = [
    'Title',
    'Body',
    'Labels',
    'Assignees',
    'Repository',
    'PriorityScore',
    'FilePath',
  ];
  const lines = [header.join(',')];
  records.forEach((record) => {
    lines.push(
      [
        csvEscape(record.title),
        csvEscape(record.body),
        csvEscape(record.labels.join(',')),
        csvEscape(record.assignees.join(',')),
        csvEscape('BrianCLong/summit'),
        '',
        csvEscape(record.filePath || ''),
      ].join(','),
    );
  });
  fs.outputFileSync(destination, `${lines.join('\n')}\n`, 'utf8');
};

const mockExistingIssues = (responses) => {
  const scope = nock(API_BASE);
  responses.forEach((payload) => {
    scope
      .get('/repos/BrianCLong/summit/issues')
      .query(true)
      .reply(200, payload);
  });
  return scope;
};

const mockCreateIssues = (times, { attach = false } = {}) => {
  let counter = 0;
  const postScope = nock(API_BASE)
    .post('/repos/BrianCLong/summit/issues')
    .times(times)
    .reply(201, () => {
      counter += 1;
      return { number: 1000 + counter, node_id: `MDU6SXNzdWU_${counter}` };
    });

  if (attach) {
    nock(API_BASE)
      .post('/graphql')
      .times(times)
      .reply(200, {
        data: { addProjectV2ItemById: { item: { id: `PVTI_${Date.now()}` } } },
      });
  }
  return postScope;
};

const runImporter = async ({ cwd, env }) =>
  execa('node', [TARGET], {
    cwd,
    env: {
      GH_TOKEN: 'gho_mock',
      OWNER: 'BrianCLong',
      REPO: 'summit',
      START_BATCH: '1',
      END_BATCH: '2',
      SLEEP_MS: '0',
      SECONDARY_BACKOFF_MS: '5',
      ...env,
    },
  });

describe('oct25 bulk importer', () => {
  let tmpDir;
  let batchesDir;
  let workingTarget;

  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  beforeEach(() => {
    tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;
    const scriptsDir = path.join(tmpDir, 'scripts');
    batchesDir = path.join(
      tmpDir,
      'project_management',
      'october2025_issue_json',
    );
    fs.ensureDirSync(scriptsDir);
    fs.ensureDirSync(batchesDir);

    workingTarget = path.join(tmpDir, TARGET);
    fs.ensureDirSync(path.dirname(workingTarget));
    fs.copyFileSync(path.resolve(TARGET), workingTarget);

    const batchOne = makeBatch(batchesDir, 1, { start: 1, count: 5 });
    const batchTwo = makeBatch(batchesDir, 2, { start: 6, count: 5 });

    const csvPath = path.join(tmpDir, 'scripts', 'output', 'issues_import.csv');
    writeCsv(csvPath, [...batchOne.records, ...batchTwo.records]);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test('creates issues from batches and attaches to project', async () => {
    mockExistingIssues([[]]);
    mockCreateIssues(10, { attach: true });

    const { stdout, exitCode } = await runImporter({
      cwd: tmpDir,
      env: {
        PROJECT_ID: 'PVT_mock',
        ADD_TO_PROJECT: '1',
        START_BATCH: '1',
        END_BATCH: '2',
      },
    });

    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/Created 10 issues/);
    expect(nock.pendingMocks()).toHaveLength(0);
  });

  test('skips duplicates when titles already exist', async () => {
    mockExistingIssues([[]]);
    mockCreateIssues(5, { attach: true });

    await runImporter({
      cwd: tmpDir,
      env: {
        PROJECT_ID: 'PVT_mock',
        ADD_TO_PROJECT: '1',
        START_BATCH: '1',
        END_BATCH: '1',
      },
    });

    nock.cleanAll();

    const existing = Array.from({ length: 5 }, (_, idx) => ({
      title: `e2e_batch_1_issue_${idx + 1}`,
    }));
    mockExistingIssues([existing, []]);

    const { stdout } = await runImporter({
      cwd: tmpDir,
      env: {
        PROJECT_ID: 'PVT_mock',
        ADD_TO_PROJECT: '1',
        START_BATCH: '1',
        END_BATCH: '1',
      },
    });

    expect(stdout).toMatch(/created 0, skipped 5/i);
    expect(nock.pendingMocks()).toHaveLength(0);
  });

  test('retries after secondary rate limit and succeeds', async () => {
    mockExistingIssues([[]]);

    let first = true;
    nock(API_BASE)
      .post('/repos/BrianCLong/summit/issues')
      .times(6)
      .reply(function reply() {
        if (first) {
          first = false;
          return [403, { message: 'You have exceeded a secondary rate limit' }];
        }
        return [201, { number: 2001, node_id: 'MDU6SXNzdWU_retry' }];
      });

    nock(API_BASE)
      .post('/graphql')
      .times(5)
      .reply(200, {
        data: { addProjectV2ItemById: { item: { id: 'PVTI_retry' } } },
      });

    const { stdout } = await runImporter({
      cwd: tmpDir,
      env: {
        PROJECT_ID: 'PVT_mock',
        ADD_TO_PROJECT: '1',
        START_BATCH: '1',
        END_BATCH: '1',
        SLEEP_MS: '0',
        SECONDARY_BACKOFF_MS: '5',
      },
    });

    expect(stdout).toMatch(/Created 5/);
    expect(nock.pendingMocks()).toHaveLength(0);
  });
});
