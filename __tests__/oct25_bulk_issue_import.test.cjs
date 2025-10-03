/* eslint-env jest */
const path = require('path');

jest.mock('fs', () => {
  const path = require('path');
  const real = jest.requireActual('fs');
  const mem = new Map();

  const api = { ...real };

  api.__setFiles = (files) => {
    mem.clear();
    Object.entries(files).forEach(([filePath, contents]) => {
      mem.set(path.resolve(filePath), contents);
    });
  };

  api.__clear = () => {
    mem.clear();
  };

  const hasEntry = (resolved) => {
    if (mem.has(resolved)) {
      return true;
    }
    for (const key of mem.keys()) {
      if (key.startsWith(resolved + path.sep)) {
        return true;
      }
    }
    return false;
  };

  api.existsSync = jest.fn((filePath) => {
    const resolved = path.resolve(filePath);
    return hasEntry(resolved);
  });

  api.readFileSync = jest.fn((filePath, encoding) => {
    const resolved = path.resolve(filePath);
    if (!mem.has(resolved)) {
      throw new Error(`Mock file not found: ${resolved}`);
    }
    const value = mem.get(resolved);
    if (encoding) {
      return value;
    }
    return Buffer.from(value);
  });

  api.readdirSync = jest.fn((dirPath) => {
    const resolved = path.resolve(dirPath);
    const entries = [];
    for (const key of mem.keys()) {
      if (path.dirname(key) === resolved) {
        entries.push(path.basename(key));
      }
    }
    return entries;
  });

  return api;
});

jest.mock('https', () => {
  const { EventEmitter } = require('events');
  const state = { queue: [], calls: [] };

  const request = jest.fn((options = {}, callback) => {
    const entry = state.queue.shift();
    if (!entry) {
      throw new Error(
        `Unexpected https request: ${(options.method || 'GET').toUpperCase()} ${options.path || ''}`
      );
    }

    const call = {
      options: { ...options },
      body: '',
    };
    state.calls.push(call);

    const req = new EventEmitter();
    req.write = jest.fn((chunk) => {
      call.body = (chunk || '').toString();
    });
    req.end = jest.fn(() => {
      if (entry.error) {
        const err = entry.error instanceof Error ? entry.error : new Error(entry.error);
        process.nextTick(() => {
          req.emit('error', err);
        });
        return;
      }
      const res = new EventEmitter();
      res.statusCode = entry.statusCode ?? 200;
      res.statusMessage = entry.statusMessage ?? 'OK';
      res.headers = entry.headers ?? {};
      process.nextTick(() => {
        callback(res);
        if (entry.body) {
          res.emit('data', entry.body);
        }
        res.emit('end');
      });
    });
    return req;
  });

  return {
    request,
    __queue: (entry) => state.queue.push(entry),
    __getCalls: () => state.calls.map((call) => ({ ...call })),
    __reset: () => {
      state.queue.length = 0;
      state.calls.length = 0;
      request.mockClear();
    },
  };
});

const CLI = path.resolve('scripts/oct25_bulk_issue_import.cjs');

const flushAsync = async () => {
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
};

const originalEnv = { ...process.env };
let exitSpy;
let timeoutSpy;
let fs;
let https;

const runImporter = async () => {
  try {
    require(CLI);
    await flushAsync();
  } catch (err) {
    if (err && typeof err.message === 'string' && err.message.startsWith('process.exit:')) {
      throw err;
    }
    throw err;
  }
};

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
  process.env.OWNER = 'test-owner';
  process.env.REPO = 'test-repo';
  process.env.GH_TOKEN = 'test-token';
  process.env.SLEEP_MS = '0';
  process.env.SECONDARY_BACKOFF_MS = '1';
  process.env.SECONDARY_BACKOFF_MAX_MS = '2';
  delete process.env.CSV_PATH;
  delete process.env.BATCH_DIR;
  delete process.env.START_BATCH;
  delete process.env.END_BATCH;
  delete process.env.PROJECT_ID;
  delete process.env.ADD_TO_PROJECT;

  exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`process.exit:${code}`);
  });
  timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
    if (typeof fn === 'function') {
      fn();
    }
    return 0;
  });

  fs = require('fs');
  https = require('https');
  fs.__clear();
  https.__reset();
});

afterEach(() => {
  exitSpy.mockRestore();
  timeoutSpy.mockRestore();
  process.env = { ...originalEnv };
});

test('prefers CSV feed when both CSV and JSON exist', async () => {
  process.env.CSV_PATH = 'project_management/october2025_issue_import.csv';
  process.env.START_BATCH = '1';
  process.env.END_BATCH = '2';

  fs.__setFiles({
    'project_management/october2025_issue_import.csv': [
      'Title,Body,Labels,Assignees,Repository',
      '"Issue A","Body A","oct25,import","","test-owner/test-repo"',
      '"Issue B","Body B","oct25,import","","test-owner/test-repo"',
    ].join('\n'),
    'project_management/october2025_issue_json/batch_1.json': JSON.stringify([
      { title: 'Fallback', body: 'Should not use' },
    ]),
  });

  https.__queue({ statusCode: 200, body: '[]' });
  https.__queue({ statusCode: 201, body: JSON.stringify({ node_id: 'node-1', number: 1 }) });
  https.__queue({ statusCode: 201, body: JSON.stringify({ node_id: 'node-2', number: 2 }) });

  await runImporter();

  expect(exitSpy).not.toHaveBeenCalled();
  expect(fs.readFileSync).toHaveBeenCalledWith(
    path.resolve('project_management/october2025_issue_import.csv'),
    'utf8'
  );
  const readJson = fs.readFileSync.mock.calls.some((call) =>
    String(call[0]).includes('batch_1.json')
  );
  expect(readJson).toBe(false);

  const calls = https.__getCalls();
  expect(calls).toHaveLength(3);
  expect(calls[0].options.method).toBe('GET');
  expect(calls[1].options.method).toBe('POST');
  expect(calls[2].options.method).toBe('POST');
});

test('falls back to JSON when CSV missing', async () => {
  process.env.CSV_PATH = 'project_management/october2025_issue_import.csv';
  process.env.BATCH_DIR = 'project_management/october2025_issue_json';
  process.env.START_BATCH = '1';
  process.env.END_BATCH = '1';

  fs.__setFiles({
    'project_management/october2025_issue_json/batch_1.json': JSON.stringify([
      { title: 'JSON A', body: 'From JSON' },
      { title: 'JSON B', body: 'From JSON' },
    ]),
  });

  https.__queue({ statusCode: 200, body: '[]' });
  https.__queue({ statusCode: 201, body: JSON.stringify({ node_id: 'node-10', number: 10 }) });
  https.__queue({ statusCode: 201, body: JSON.stringify({ node_id: 'node-11', number: 11 }) });

  await runImporter();

  expect(exitSpy).not.toHaveBeenCalled();
  const jsonRead = fs.readFileSync.mock.calls.find((call) =>
    String(call[0]).includes('batch_1.json')
  );
  expect(jsonRead).toBeDefined();

  const calls = https.__getCalls();
  expect(calls.map((c) => c.options.method)).toEqual(['GET', 'POST', 'POST']);
});

test('retries on secondary-rate-limit and eventually succeeds', async () => {
  process.env.CSV_PATH = 'project_management/october2025_issue_import.csv';

  fs.__setFiles({
    'project_management/october2025_issue_import.csv': [
      'Title,Body,Labels,Assignees,Repository',
      '"Rate Limited","Testing","oct25","","test-owner/test-repo"',
    ].join('\n'),
  });

  https.__queue({ statusCode: 200, body: '[]' });
  https.__queue({
    statusCode: 403,
    statusMessage: 'Forbidden',
    body: 'secondary rate limit',
  });
  https.__queue({ statusCode: 201, body: JSON.stringify({ node_id: 'node-20', number: 20 }) });

  await runImporter();

  const calls = https.__getCalls();
  const postCalls = calls.filter((call) => call.options.method === 'POST');
  expect(postCalls).toHaveLength(2);
});

test('attaches created issues to a Project (calls GitHub project API)', async () => {
  process.env.CSV_PATH = 'project_management/october2025_issue_import.csv';
  process.env.PROJECT_ID = 'PVT_kwHO12345';
  process.env.ADD_TO_PROJECT = '1';

  fs.__setFiles({
    'project_management/october2025_issue_import.csv': [
      'Title,Body,Labels,Assignees,Repository',
      '"Attach Me","Ensure attach","oct25","","test-owner/test-repo"',
    ].join('\n'),
  });

  https.__queue({ statusCode: 200, body: '[]' });
  https.__queue({ statusCode: 201, body: JSON.stringify({ node_id: 'node-42', number: 42 }) });
  https.__queue({ statusCode: 200, body: JSON.stringify({}) });

  await runImporter();

  const calls = https.__getCalls();
  const graphqlCall = calls.find((call) => call.options.path === '/graphql');
  expect(graphqlCall).toBeDefined();
  expect(JSON.parse(graphqlCall.body)).toEqual(
    expect.objectContaining({
      query: expect.stringContaining('addProjectV2ItemById'),
      variables: expect.objectContaining({ projectId: 'PVT_kwHO12345' }),
    })
  );
});
