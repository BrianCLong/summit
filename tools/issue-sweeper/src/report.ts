import { promises as fs } from 'fs';
import path from 'path';

const REPORT_FILE = path.join('tools', 'issue-sweeper', 'REPORT.md');

export interface BatchSummary {
    batch_range: string;
    counts: {
        already_solved: number;
        not_solved: number;
        blocked: number;
        duplicate: number;
        invalid: number;
        solved_in_this_run: number;
    };
    prs_opened: any[];
    failures: any[];
}

export async function appendToReport(summary: BatchSummary) {
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

    await fs.appendFile(REPORT_FILE, reportContent);
}

export async function initReport() {
    const header = `# Issue Sweeper Report

This report summarizes the results of the issue sweeper runs.
`;
    try {
        await fs.access(REPORT_FILE);
    } catch (error) {
        // File does not exist, create it
        await fs.writeFile(REPORT_FILE, header);
    }
}