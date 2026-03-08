"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appendToReport = appendToReport;
exports.initReport = initReport;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const REPORT_FILE = path_1.default.join('tools', 'issue-sweeper', 'REPORT.md');
async function appendToReport(summary) {
    const reportContent = `
## Batch Report (${new Date().toISOString()})

- **Issue Range:** ${summary.batch_range}
- **Counts:**
    - Already Solved: ${summary.counts.already_solved}
    - Not Solved: ${summary.counts.not_solved}
    - Blocked: ${summary.counts.blocked}
    - Duplicate: ${summary.counts.duplicate}
    - Invalid: ${summary.counts.invalid}
    - Solved in this Run: ${summary.counts.solved_in_this_run}
- **PRs Opened:** ${summary.prs_opened.length}
- **Failures:** ${summary.failures.length}
`;
    await fs_1.promises.appendFile(REPORT_FILE, reportContent);
}
async function initReport() {
    const header = `# Issue Sweeper Report

This report summarizes the results of the issue sweeper runs.
`;
    try {
        await fs_1.promises.access(REPORT_FILE);
    }
    catch (error) {
        // File does not exist, create it
        await fs_1.promises.writeFile(REPORT_FILE, header);
    }
}
