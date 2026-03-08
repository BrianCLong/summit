"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeLedgerEntry = writeLedgerEntry;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const LEDGER_DIR = path_1.default.join('tools', 'issue-sweeper', 'ledger');
function classifyIssue(issue) {
    const labelNames = issue.labels.map((l) => l.name.toLowerCase());
    if (labelNames.includes('bug'))
        return 'bug';
    if (labelNames.includes('feature') || labelNames.includes('enhancement'))
        return 'feature';
    if (labelNames.includes('documentation'))
        return 'docs';
    if (labelNames.includes('question'))
        return 'question';
    if (labelNames.includes('security'))
        return 'security';
    if (labelNames.includes('ci') || labelNames.includes('build'))
        return 'ci';
    if (labelNames.includes('performance'))
        return 'perf';
    if (labelNames.includes('refactor'))
        return 'refactor';
    return 'unknown';
}
async function writeLedgerEntry(issue, result, runId) {
    const ledgerEntry = {
        issue_number: issue.number,
        title: issue.title,
        url: issue.html_url,
        state: issue.state,
        labels: issue.labels,
        updatedAt: issue.updated_at,
        createdAt: issue.created_at,
        classification: classifyIssue(issue),
        solved_status: result.solved_status,
        evidence: result.evidence,
        actions_taken: [], // Will be populated later
        verification: [], // Will be populated later
        notes: '', // Will be populated later
        run_id: runId,
    };
    const filePath = path_1.default.join(LEDGER_DIR, `${issue.number}.json`);
    await fs_1.promises.writeFile(filePath, JSON.stringify(ledgerEntry, null, 2));
}
// In the future, a function to compile the individual json files into
// a single LEDGER.ndjson file would go here.
