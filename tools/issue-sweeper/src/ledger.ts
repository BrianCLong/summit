import { promises as fs } from 'fs';
import path from 'path';
import { DetectionResult, SolvedStatus } from './detect.js';

const LEDGER_DIR = path.join('tools', 'issue-sweeper', 'ledger');

export interface LedgerEntry {
    issue_number: number;
    title: string;
    url: string;
    state: 'open' | 'closed';
    labels: { name: string }[];
    updatedAt: string;
    createdAt: string;
    classification: 'bug' | 'feature' | 'docs' | 'question' | 'security' | 'ci' | 'perf' | 'refactor' | 'unknown';
    solved_status: SolvedStatus;
    evidence: DetectionResult['evidence'];
    actions_taken: string[];
    verification: string[];
    notes: string;
    run_id: string;
}

function classifyIssue(issue: any): LedgerEntry['classification'] {
    const labelNames = issue.labels.map((l: any) => l.name.toLowerCase());
    if (labelNames.includes('bug')) return 'bug';
    if (labelNames.includes('feature') || labelNames.includes('enhancement')) return 'feature';
    if (labelNames.includes('documentation')) return 'docs';
    if (labelNames.includes('question')) return 'question';
    if (labelNames.includes('security')) return 'security';
    if (labelNames.includes('ci') || labelNames.includes('build')) return 'ci';
    if (labelNames.includes('performance')) return 'perf';
    if (labelNames.includes('refactor')) return 'refactor';
    return 'unknown';
}

export async function writeLedgerEntry(issue: any, result: DetectionResult, runId: string) {
    const ledgerEntry: LedgerEntry = {
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

    const filePath = path.join(LEDGER_DIR, `${issue.number}.json`);
    await fs.writeFile(filePath, JSON.stringify(ledgerEntry, null, 2));
}

// In the future, a function to compile the individual json files into
// a single LEDGER.ndjson file would go here.