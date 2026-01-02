/**
 * Basic tests for issue sweeper functionality
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { classifyIssue } from '../src/detect.js';
import { Ledger } from '../src/ledger.js';
import type { GitHubIssue, LedgerEntry } from '../src/types.js';

const FIXTURES_DIR = join(process.cwd(), 'test', 'fixtures');
const TEST_DIR = join(process.cwd(), 'test', 'temp');

/**
 * Load fixture data
 */
async function loadFixture<T>(filename: string): Promise<T> {
  const content = await readFile(join(FIXTURES_DIR, filename), 'utf-8');
  return JSON.parse(content);
}

/**
 * Setup test directory
 */
async function setupTestDir(): Promise<void> {
  if (existsSync(TEST_DIR)) {
    await rm(TEST_DIR, { recursive: true, force: true });
  }
  await mkdir(TEST_DIR, { recursive: true });
}

/**
 * Cleanup test directory
 */
async function cleanupTestDir(): Promise<void> {
  if (existsSync(TEST_DIR)) {
    await rm(TEST_DIR, { recursive: true, force: true });
  }
}

test('classifyIssue - should classify bug from label', () => {
  const issue: GitHubIssue = {
    number: 1,
    title: 'Something is broken',
    html_url: 'https://example.com',
    state: 'open',
    labels: [{ name: 'bug' }],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user: { login: 'test' },
  };

  const classification = classifyIssue(issue);
  assert.strictEqual(classification, 'bug');
});

test('classifyIssue - should classify feature from label', () => {
  const issue: GitHubIssue = {
    number: 2,
    title: 'Add new feature',
    html_url: 'https://example.com',
    state: 'open',
    labels: [{ name: 'enhancement' }],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user: { login: 'test' },
  };

  const classification = classifyIssue(issue);
  assert.strictEqual(classification, 'feature');
});

test('classifyIssue - should classify security from label', () => {
  const issue: GitHubIssue = {
    number: 3,
    title: 'Security issue',
    html_url: 'https://example.com',
    state: 'open',
    labels: [{ name: 'security' }],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user: { login: 'test' },
  };

  const classification = classifyIssue(issue);
  assert.strictEqual(classification, 'security');
});

test('classifyIssue - should classify docs from label', () => {
  const issue: GitHubIssue = {
    number: 4,
    title: 'Update documentation',
    html_url: 'https://example.com',
    state: 'open',
    labels: [{ name: 'documentation' }],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user: { login: 'test' },
  };

  const classification = classifyIssue(issue);
  assert.strictEqual(classification, 'docs');
});

test('classifyIssue - should classify from title when no labels', () => {
  const issue: GitHubIssue = {
    number: 5,
    title: 'Bug: Login is broken',
    html_url: 'https://example.com',
    state: 'open',
    labels: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user: { login: 'test' },
  };

  const classification = classifyIssue(issue);
  assert.strictEqual(classification, 'bug');
});

test('Ledger - should save and load entry (idempotency)', async () => {
  await setupTestDir();

  try {
    const ledger = new Ledger(TEST_DIR);
    await ledger.initialize();

    const entry: LedgerEntry = {
      issue_number: 123,
      title: 'Test issue',
      url: 'https://example.com/123',
      state: 'open',
      labels: ['bug'],
      updatedAt: '2024-01-01T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      classification: 'bug',
      solved_status: 'not_solved',
      evidence: { prs: [], commits: [], paths: [], tests: [] },
      actions_taken: [],
      verification: [],
      notes: 'Test note',
      run_id: 'test-run',
      processed_at: '2024-01-01T00:00:00Z',
    };

    // Save entry
    await ledger.saveEntry(entry);

    // Check it exists
    const exists = await ledger.hasIssue(123);
    assert.strictEqual(exists, true);

    // Load entry
    const loaded = await ledger.getEntry(123);
    assert.ok(loaded);
    assert.strictEqual(loaded.issue_number, 123);
    assert.strictEqual(loaded.title, 'Test issue');
    assert.strictEqual(loaded.solved_status, 'not_solved');

    // Save again (idempotency test)
    entry.notes = 'Updated note';
    await ledger.saveEntry(entry);

    // Load again
    const updated = await ledger.getEntry(123);
    assert.ok(updated);
    assert.strictEqual(updated.notes, 'Updated note');
  } finally {
    await cleanupTestDir();
  }
});

test('Ledger - should load all entries', async () => {
  await setupTestDir();

  try {
    const ledger = new Ledger(TEST_DIR);
    await ledger.initialize();

    // Save multiple entries
    for (let i = 1; i <= 5; i++) {
      const entry: LedgerEntry = {
        issue_number: i,
        title: `Issue ${i}`,
        url: `https://example.com/${i}`,
        state: 'open',
        labels: [],
        updatedAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        classification: 'bug',
        solved_status: 'not_solved',
        evidence: { prs: [], commits: [], paths: [], tests: [] },
        actions_taken: [],
        verification: [],
        notes: '',
        run_id: 'test-run',
        processed_at: '2024-01-01T00:00:00Z',
      };
      await ledger.saveEntry(entry);
    }

    // Load all
    const entries = await ledger.loadAllEntries();
    assert.strictEqual(entries.length, 5);
    assert.strictEqual(entries[0].issue_number, 1);
    assert.strictEqual(entries[4].issue_number, 5);
  } finally {
    await cleanupTestDir();
  }
});

test('Ledger - should generate NDJSON', async () => {
  await setupTestDir();

  try {
    const ledger = new Ledger(TEST_DIR);
    await ledger.initialize();

    // Save entries
    for (let i = 1; i <= 3; i++) {
      const entry: LedgerEntry = {
        issue_number: i,
        title: `Issue ${i}`,
        url: `https://example.com/${i}`,
        state: 'open',
        labels: [],
        updatedAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        classification: 'bug',
        solved_status: 'not_solved',
        evidence: { prs: [], commits: [], paths: [], tests: [] },
        actions_taken: [],
        verification: [],
        notes: '',
        run_id: 'test-run',
        processed_at: '2024-01-01T00:00:00Z',
      };
      await ledger.saveEntry(entry);
    }

    // Generate NDJSON
    await ledger.generateNDJSON();

    // Check file exists
    const ndjsonPath = join(TEST_DIR, 'LEDGER.ndjson');
    assert.strictEqual(existsSync(ndjsonPath), true);

    // Verify content
    const content = await readFile(ndjsonPath, 'utf-8');
    const lines = content.trim().split('\n');
    assert.strictEqual(lines.length, 3);

    // Each line should be valid JSON
    for (const line of lines) {
      const entry = JSON.parse(line);
      assert.ok(entry.issue_number);
      assert.ok(entry.title);
    }
  } finally {
    await cleanupTestDir();
  }
});

test('Ledger - should get stats', async () => {
  await setupTestDir();

  try {
    const ledger = new Ledger(TEST_DIR);
    await ledger.initialize();

    // Save entries with different statuses
    const statuses = ['already_solved', 'not_solved', 'already_solved', 'blocked', 'duplicate'];

    for (let i = 0; i < statuses.length; i++) {
      const entry: LedgerEntry = {
        issue_number: i + 1,
        title: `Issue ${i + 1}`,
        url: `https://example.com/${i + 1}`,
        state: 'open',
        labels: [],
        updatedAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        classification: 'bug',
        solved_status: statuses[i] as any,
        evidence: { prs: [], commits: [], paths: [], tests: [] },
        actions_taken: [],
        verification: [],
        notes: '',
        run_id: 'test-run',
        processed_at: '2024-01-01T00:00:00Z',
      };
      await ledger.saveEntry(entry);
    }

    // Get stats
    const stats = await ledger.getStats();
    assert.strictEqual(stats.total, 5);
    assert.strictEqual(stats.bySolvedStatus.already_solved, 2);
    assert.strictEqual(stats.bySolvedStatus.not_solved, 1);
    assert.strictEqual(stats.bySolvedStatus.blocked, 1);
    assert.strictEqual(stats.bySolvedStatus.duplicate, 1);
  } finally {
    await cleanupTestDir();
  }
});

test('Fixtures - should load issues fixture', async () => {
  const issues = await loadFixture<GitHubIssue[]>('issues.json');
  assert.strictEqual(Array.isArray(issues), true);
  assert.ok(issues.length > 0);
  assert.ok(issues[0].number);
  assert.ok(issues[0].title);
});

test('Fixtures - should load PRs fixture', async () => {
  const prs = await loadFixture('prs.json');
  assert.strictEqual(Array.isArray(prs), true);
  assert.ok((prs as any).length > 0);
});
