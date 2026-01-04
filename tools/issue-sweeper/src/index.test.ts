import { test, mock } from 'node:test';
import assert from 'node:assert';
import { GitHubClient } from '../src/github';
import { Ledger, State, LedgerEntry } from '../src/ledger';
import { detectAlreadySolved } from '../src/detect';
import path from 'path';
import { promises as fs } from 'fs';

// Mock the GitHubClient to return fixture data
mock.mockClass(GitHubClient, class MockGitHubClient {
  constructor(repo: string) {}
  async getIssues(state: any, perPage: any, page: any, since: any): Promise<any[]> {
    const issues = JSON.parse(await fs.readFile(path.join(__dirname, 'fixtures', 'issues.json'), 'utf-8'));
    // Simulate pagination
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return issues.slice(startIndex, endIndex);
  }
  async searchPullRequests(query: string): Promise<any[]> {
    const prs = JSON.parse(await fs.readFile(path.join(__dirname, 'fixtures', 'prs.json'), 'utf-8'));
    if (query.includes('#3')) { // Simulate PR #125 fixing issue #3
      return prs.filter((pr: any) => pr.number === 125);
    }
    if (query.includes('#5')) { // Simulate PR #123 fixing issue #5
      return prs.filter((pr: any) => pr.number === 123);
    }
    return [];
  }
  async addIssueComment(issueNumber: number, body: string): Promise<any> {
    // console.log(`Mock: Commented on issue #${issueNumber}: ${body}`);
    return {};
  }
});

const TOOLS_DIR = path.resolve(__dirname, '..'); // tools/issue-sweeper

test('detectAlreadySolved identifies issues solved by merged PRs', async (t) => {
  const github = new GitHubClient('BrianCLong/summit');

  await t.test('should detect issue #3 as solved by PR #125', async () => {
    const { status, evidence } = await detectAlreadySolved(3, 'Bug: API endpoint returns 500', github);
    assert.strictEqual(status, 'already_solved');
    assert.strictEqual(evidence.prs.length, 1);
    assert.strictEqual(evidence.prs[0].number, 125);
    assert.notStrictEqual(evidence.prs[0].mergedAt, null);
  });

  await t.test('should detect issue #5 as solved by PR #123', async () => {
    const { status, evidence } = await detectAlreadySolved(5, 'Bug: Another UI issue fixed by #123', github);
    assert.strictEqual(status, 'already_solved');
    assert.strictEqual(evidence.prs.length, 1);
    assert.strictEqual(evidence.prs[0].number, 123);
    assert.notStrictEqual(evidence.prs[0].mergedAt, null);
  });

  await t.test('should not detect issue #1 as solved without evidence', async () => {
    const { status } = await detectAlreadySolved(1, 'Bug: UI element not rendering correctly', github);
    assert.strictEqual(status, 'not_solved');
  });
});

test('Ledger idempotency works', async (t) => {
  const ledger = new Ledger(TOOLS_DIR);
  const github = new GitHubClient('BrianCLong/summit'); // Mocked
  const runId = 'test-run-123';

  // Clear ledger before test
  await ledger.resetLedger();
  await ledger.resetState();

  const issue1: LedgerEntry = {
    issue_number: 1,
    title: 'Test Issue 1',
    url: 'url1',
    state: 'open',
    labels: [],
    updatedAt: '2025-01-01T00:00:00Z',
    createdAt: '2025-01-01T00:00:00Z',
    classification: 'bug',
    solved_status: 'not_solved',
    evidence: { prs: [], commits: [], paths: [], tests: [] },
    actions_taken: [],
    verification: [],
    notes: '',
    run_id: runId,
  };

  const issue2: LedgerEntry = {
    issue_number: 2,
    title: 'Test Issue 2',
    url: 'url2',
    state: 'open',
    labels: [],
    updatedAt: '2025-01-01T00:00:00Z',
    createdAt: '2025-01-01T00:00:00Z',
    classification: 'feature',
    solved_status: 'not_solved',
    evidence: { prs: [], commits: [], paths: [], tests: [] },
    actions_taken: [],
    verification: [],
    notes: '',
    run_id: runId,
  };

  await t.test('should append new entries', async () => {
    await ledger.appendLedgerEntry(issue1);
    await ledger.appendLedgerEntry(issue2);
    const entries = ledger.getAllLedgerEntries();
    assert.strictEqual(entries.length, 2);
    assert.deepStrictEqual(entries[0].issue_number, 1);
    assert.deepStrictEqual(entries[1].issue_number, 2);
  });

  await t.test('should not append duplicate entries', async () => {
    // Try to append issue1 again
    await ledger.appendLedgerEntry(issue1);
    const entries = ledger.getAllLedgerEntries();
    assert.strictEqual(entries.length, 2, 'Ledger should still have 2 entries');
  });

  await t.test('should load existing ledger entries on initialization', async () => {
    const newLedgerInstance = new Ledger(TOOLS_DIR);
    await newLedgerInstance.loadLedger();
    const entries = newLedgerInstance.getAllLedgerEntries();
    assert.strictEqual(entries.length, 2);
    assert.deepStrictEqual(entries[0].issue_number, 1);
    assert.deepStrictEqual(entries[1].issue_number, 2);
  });
});

// Test for pagination is implicitly covered by the main run loop if getIssues is mocked correctly
// and the loop continues until no more issues are returned.
// For a dedicated test, one would mock getIssues to return a fixed number of pages.
test('Pagination logic (implicit via mocked getIssues)', async (t) => {
  const github = new GitHubClient('BrianCLong/summit'); // Mocked
  const issuesPerPage = 2;
  let page = 1;
  let allIssues: any[] = [];
  while (true) {
    const issues = await github.getIssues('all', issuesPerPage, page);
    if (issues.length === 0) break;
    allIssues = allIssues.concat(issues);
    page++;
  }
  assert.strictEqual(allIssues.length, 5, 'Should fetch all 5 issues from fixtures');
  assert.strictEqual(page - 1, Math.ceil(5 / issuesPerPage), 'Should make correct number of API calls');
});
