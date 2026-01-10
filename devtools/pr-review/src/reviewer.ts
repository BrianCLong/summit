import { DiffFile, ReviewFinding } from './types';
import { scanForSecrets } from './secret-scanner';

export class Reviewer {
  private findings: ReviewFinding[] = [];

  constructor(private diffs: DiffFile[]) {}

  public review(): ReviewFinding[] {
    this.findings = [];

    // Check for missing tests
    this.checkMissingTests();

    for (const file of this.diffs) {
      if (!file.to || file.to === '/dev/null') {continue;} // Skip deleted files

      this.checkRiskyFiles(file.to);

      for (const chunk of file.chunks) {
        for (const change of chunk.changes) {
          if (change.type === 'add') {
             // Line-level checks
             const lineNum = change.ln2;
             const content = change.content;

             // 1. Secret Scan (Critical)
             const secretFinding = scanForSecrets(content, file.to, lineNum);
             if (secretFinding) {
               this.findings.push(secretFinding);
             }

             // 2. Error Handling
             this.checkErrorHandling(content, file.to, lineNum);

             // 3. Pagination
             this.checkPagination(content, file.to, lineNum);
          }
        }
      }
    }

    return this.findings;
  }

  private checkMissingTests() {
    const sourceFiles = this.diffs
      .filter(d => d.to && d.to.match(/\.(ts|js|py|go|rs)$/) && !d.to.match(/\.test\.|_test\.|spec\./))
      .map(d => d.to as string);

    const testFiles = this.diffs
      .filter(d => d.to && (d.to.match(/\.test\.|_test\.|spec\./) || d.to.includes('/tests/') || d.to.includes('/test/')))
      .map(d => d.to as string);

    // Simple heuristic: if source code changed but no test code changed, flag it.
    // This is a naive check; a better one would map src/foo.ts to tests/foo.test.ts
    if (sourceFiles.length > 0 && testFiles.length === 0) {
      this.findings.push({
        type: 'test',
        severity: 'warning',
        message: `Source files modified (${sourceFiles.length}) but no tests modified.`,
        ruleId: 'missing-tests'
      });
    }
  }

  private checkRiskyFiles(filename: string) {
    const riskKeywords = ['security', 'policy', 'export', 'auth', 'role', 'permission', 'secret', 'key'];
    if (riskKeywords.some(kw => filename.toLowerCase().includes(kw))) {
      this.findings.push({
        type: 'risk',
        severity: 'warning',
        file: filename,
        message: `Modification to high-risk file: ${filename}`,
        ruleId: 'risky-file-modified'
      });
    }
  }

  private checkErrorHandling(content: string, file: string, line?: number) {
    // Very simple heuristic: warn if empty catch block (if parsed) or TODO in error handling
    if (content.match(/catch\s*\(\w+\)\s*\{\s*\}/)) {
       this.findings.push({
         type: 'error',
         severity: 'warning',
         file,
         line,
         message: 'Empty catch block detected.',
         ruleId: 'empty-catch'
       });
    }
  }

  private checkPagination(content: string, file: string, line?: number) {
    // Look for list/search methods without limit/offset/pagination args in the same line (heuristic)
    if (content.match(/(findAll|list|search|query)\(/i) && !content.match(/(limit|offset|page|cursor)/i)) {
       this.findings.push({
         type: 'style',
         severity: 'info',
         file,
         line,
         message: 'Potential unpaginated list query.',
         ruleId: 'missing-pagination'
       });
    }
  }
}
