import { promises as fs } from 'fs';
import path from 'path';
import { LedgerEntry } from './ledger';

const REPORT_FILE = 'REPORT.md';

export class Reporter {
  private readonly reportFilePath: string;

  constructor(toolsDir: string) {
    this.reportFilePath = path.join(toolsDir, REPORT_FILE);
  }

  async appendBatchReport(
    batchNumber: number,
    processedEntries: LedgerEntry[],
    openPrs: { issue_number: number; pr_url: string }[]
  ): Promise<void> {
    let reportContent = `## Batch Report - Batch #${batchNumber}\n`;
    reportContent += `Run at: ${new Date().toISOString()}\n\n`;

    const counts = processedEntries.reduce((acc, entry) => {
      acc[entry.solved_status] = (acc[entry.solved_status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    reportContent += '### Summary by Solved Status:\n';
    for (const status in counts) {
      reportContent += `- ${status}: ${counts[status]}\n`;
    }
    reportContent += '\n';

    const prsOpenedInBatch = openPrs.filter(pr =>
      processedEntries.some(entry => entry.issue_number === pr.issue_number && entry.solved_status === 'solved_in_this_run')
    );

    if (prsOpenedInBatch.length > 0) {
      reportContent += '### Pull Requests Opened in this Batch:\n';
      prsOpenedInBatch.forEach(pr => {
        reportContent += `- Issue #${pr.issue_number}: ${pr.pr_url}\n`;
      });
      reportContent += '\n';
    }

    // TODO: Implement logic for top recurring labels and systemic failure patterns
    // This would require more sophisticated analysis of the `processedEntries` and potentially the full ledger.
    reportContent += '### Systemic Themes (TODO: Implement analysis)\n';
    reportContent += '- [ ] Dependency drift\n';
    reportContent += '- [ ] Flaky tests\n';
    reportContent += '- [ ] Docs gaps\n';
    reportContent += '\n---\n\n';

    await fs.appendFile(this.reportFilePath, reportContent, 'utf-8');
  }

  async initializeReport(): Promise<void> {
    const initialContent = `# Issue Sweeper Report\n\nThis report summarizes the progress of the Issue Sweeper tool.\n\n`;
    try {
      await fs.writeFile(this.reportFilePath, initialContent, 'utf-8');
    } catch (error: any) {
      console.error('Error initializing report file:', error);
      throw error;
    }
  }
}
