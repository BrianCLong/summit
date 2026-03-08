"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const detect_js_1 = require("../src/detect.js");
const github_js_1 = require("../src/github.js");
const ledger_js_1 = require("../src/ledger.js");
const sinon_1 = __importDefault(require("sinon"));
const FIXTURES_DIR = path_1.default.join('tools', 'issue-sweeper', 'test', 'fixtures');
const LEDGER_DIR = path_1.default.join('tools', 'issue-sweeper', 'ledger');
(0, node_test_1.describe)('Issue Sweeper Tests', () => {
    let issues;
    let prs;
    (0, node_test_1.before)(async () => {
        const issuesContent = await fs_1.promises.readFile(path_1.default.join(FIXTURES_DIR, 'issues.json'), 'utf-8');
        issues = JSON.parse(issuesContent);
        const prsContent = await fs_1.promises.readFile(path_1.default.join(FIXTURES_DIR, 'prs.json'), 'utf-8');
        prs = JSON.parse(prsContent);
        // Clean up ledger dir before tests
        await fs_1.promises.rm(LEDGER_DIR, { recursive: true, force: true });
        await fs_1.promises.mkdir(LEDGER_DIR, { recursive: true });
    });
    (0, node_test_1.after)(async () => {
        // Clean up ledger dir after tests
        await fs_1.promises.rm(LEDGER_DIR, { recursive: true, force: true });
        await fs_1.promises.mkdir(LEDGER_DIR, { recursive: true });
    });
    (0, node_test_1.test)('detectAlreadySolved identifies a solved issue', async () => {
        const issue = issues.find(i => i.number === 2);
        const githubClientStub = sinon_1.default.createStubInstance(github_js_1.GitHubClient);
        githubClientStub.searchPRs.withArgs(2).resolves({
            items: [prs.items.find((p) => p.number === 102)]
        });
        const result = await (0, detect_js_1.detectAlreadySolved)(issue, githubClientStub);
        node_assert_1.default.strictEqual(result.solved_status, 'already_solved');
        node_assert_1.default.strictEqual(result.evidence.prs.length, 1);
        node_assert_1.default.strictEqual(result.evidence.prs[0].number, 102);
    });
    (0, node_test_1.test)('detectAlreadySolved identifies an unsolved issue', async () => {
        const issue = issues.find(i => i.number === 1);
        const githubClientStub = sinon_1.default.createStubInstance(github_js_1.GitHubClient);
        githubClientStub.searchPRs.withArgs(1).resolves({
            items: [prs.items.find((p) => p.number === 101)]
        });
        const result = await (0, detect_js_1.detectAlreadySolved)(issue, githubClientStub);
        node_assert_1.default.strictEqual(result.solved_status, 'not_solved');
        node_assert_1.default.strictEqual(result.evidence.prs.length, 1);
    });
    (0, node_test_1.test)('writeLedgerEntry creates a ledger file', async () => {
        const issue = issues.find(i => i.number === 1);
        const result = {
            solved_status: 'not_solved',
            evidence: { prs: [], commits: [], paths: [], tests: [] },
        };
        await (0, ledger_js_1.writeLedgerEntry)(issue, result, 'test-run-1');
        const ledgerFilePath = path_1.default.join(LEDGER_DIR, '1.json');
        const ledgerContent = await fs_1.promises.readFile(ledgerFilePath, 'utf-8');
        const ledgerData = JSON.parse(ledgerContent);
        node_assert_1.default.strictEqual(ledgerData.issue_number, 1);
        node_assert_1.default.strictEqual(ledgerData.solved_status, 'not_solved');
    });
    (0, node_test_1.test)('Ledger is idempotent', async () => {
        const issue = issues.find(i => i.number === 1);
        const result = {
            solved_status: 'not_solved',
            evidence: { prs: [], commits: [], paths: [], tests: [] },
        };
        // Write the same entry twice
        await (0, ledger_js_1.writeLedgerEntry)(issue, result, 'test-run-2');
        await (0, ledger_js_1.writeLedgerEntry)(issue, result, 'test-run-3');
        const ledgerFilePath = path_1.default.join(LEDGER_DIR, '1.json');
        const ledgerContent = await fs_1.promises.readFile(ledgerFilePath, 'utf-8');
        const ledgerData = JSON.parse(ledgerContent);
        // Check that it was overwritten, not duplicated
        node_assert_1.default.strictEqual(ledgerData.run_id, 'test-run-3');
        const files = await fs_1.promises.readdir(LEDGER_DIR);
        // There should only be one file for issue 1
        node_assert_1.default.ok(files.some(f => f === '1.json'));
    });
});
