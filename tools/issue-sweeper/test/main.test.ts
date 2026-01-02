import { test, describe, before, after, mock } from 'node:test';
import assert from 'node:assert';
import { promises as fs } from 'fs';
import path from 'path';
import { detectAlreadySolved } from '../src/detect.js';
import { GitHubClient } from '../src/github.js';
import { writeLedgerEntry } from '../src/ledger.js';
import sinon from 'sinon';

const FIXTURES_DIR = path.join('tools', 'issue-sweeper', 'test', 'fixtures');
const LEDGER_DIR = path.join('tools', 'issue-sweeper', 'ledger');

describe('Issue Sweeper Tests', () => {
    let issues: any[];
    let prs: any;

    before(async () => {
        const issuesContent = await fs.readFile(path.join(FIXTURES_DIR, 'issues.json'), 'utf-8');
        issues = JSON.parse(issuesContent);
        const prsContent = await fs.readFile(path.join(FIXTURES_DIR, 'prs.json'), 'utf-8');
        prs = JSON.parse(prsContent);

        // Clean up ledger dir before tests
        await fs.rm(LEDGER_DIR, { recursive: true, force: true });
        await fs.mkdir(LEDGER_DIR, { recursive: true });
    });

    after(async () => {
        // Clean up ledger dir after tests
        await fs.rm(LEDGER_DIR, { recursive: true, force: true });
        await fs.mkdir(LEDGER_DIR, { recursive: true });
    });

    test('detectAlreadySolved identifies a solved issue', async () => {
        const issue = issues.find(i => i.number === 2);
        const githubClientStub = sinon.createStubInstance(GitHubClient);
        githubClientStub.searchPRs.withArgs(2).resolves({
            items: [prs.items.find((p: any) => p.number === 102)]
        });

        const result = await detectAlreadySolved(issue, githubClientStub);
        assert.strictEqual(result.solved_status, 'already_solved');
        assert.strictEqual(result.evidence.prs.length, 1);
        assert.strictEqual(result.evidence.prs[0].number, 102);
    });

    test('detectAlreadySolved identifies an unsolved issue', async () => {
        const issue = issues.find(i => i.number === 1);
        const githubClientStub = sinon.createStubInstance(GitHubClient);
        githubClientStub.searchPRs.withArgs(1).resolves({
            items: [prs.items.find((p: any) => p.number === 101)]
        });

        const result = await detectAlreadySolved(issue, githubClientStub);
        assert.strictEqual(result.solved_status, 'not_solved');
        assert.strictEqual(result.evidence.prs.length, 1);
    });

    test('writeLedgerEntry creates a ledger file', async () => {
        const issue = issues.find(i => i.number === 1);
        const result = {
            solved_status: 'not_solved' as const,
            evidence: { prs: [], commits: [], paths: [], tests: [] },
        };
        await writeLedgerEntry(issue, result, 'test-run-1');

        const ledgerFilePath = path.join(LEDGER_DIR, '1.json');
        const ledgerContent = await fs.readFile(ledgerFilePath, 'utf-8');
        const ledgerData = JSON.parse(ledgerContent);

        assert.strictEqual(ledgerData.issue_number, 1);
        assert.strictEqual(ledgerData.solved_status, 'not_solved');
    });

    test('Ledger is idempotent', async () => {
        const issue = issues.find(i => i.number === 1);
        const result = {
            solved_status: 'not_solved' as const,
            evidence: { prs: [], commits: [], paths: [], tests: [] },
        };
        
        // Write the same entry twice
        await writeLedgerEntry(issue, result, 'test-run-2');
        await writeLedgerEntry(issue, result, 'test-run-3');

        const ledgerFilePath = path.join(LEDGER_DIR, '1.json');
        const ledgerContent = await fs.readFile(ledgerFilePath, 'utf-8');
        const ledgerData = JSON.parse(ledgerContent);

        // Check that it was overwritten, not duplicated
        assert.strictEqual(ledgerData.run_id, 'test-run-3');

        const files = await fs.readdir(LEDGER_DIR);
        // There should only be one file for issue 1
        assert.ok(files.some(f => f === '1.json'));
    });
});