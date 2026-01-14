import parseDiff from 'parse-diff';
import * as fs from 'fs';
import { Reviewer } from './reviewer';
import { ReviewFinding, ReviewOutput } from './types';

function generateMarkdown(findings: ReviewFinding[]): string {
  if (findings.length === 0) {
    return '## PR Review\n\n✅ No issues found by the automated reviewer.';
  }

  let md = '## PR Review Findings\n\n';

  // Group by severity
  const critical = findings.filter(f => f.severity === 'critical');
  const warning = findings.filter(f => f.severity === 'warning');
  const info = findings.filter(f => f.severity === 'info');

  if (critical.length > 0) {
    md += '### 🚨 Critical Issues (Must Fix)\n';
    critical.forEach(f => {
      md += `- **${f.ruleId}**: ${f.message} (${f.file}${f.line ? `:${f.line}` : ''})\n`;
    });
    md += '\n';
  }

  if (warning.length > 0) {
    md += '### ⚠️ Warnings\n';
    warning.forEach(f => {
      md += `- **${f.ruleId}**: ${f.message} (${f.file}${f.line ? `:${f.line}` : ''})\n`;
    });
    md += '\n';
  }

  if (info.length > 0) {
    md += '### ℹ️ Suggestions\n';
    info.forEach(f => {
      md += `- **${f.ruleId}**: ${f.message} (${f.file}${f.line ? `:${f.line}` : ''})\n`;
    });
    md += '\n';
  }

  return md;
}

function main() {
  const args = process.argv.slice(2);
  const diffFile = args[0];

  if (!diffFile) {
    process.stderr.write('Usage: scan <diff-file>\n');
    process.exit(1);
  }

  try {
    const diffContent = fs.readFileSync(diffFile, 'utf8');
    const files = parseDiff(diffContent);

    // Convert to internal format if needed, but parse-diff matches our needs mostly
    // We cast to our type which is structurally compatible enough or we map it
    const diffFiles = files.map(f => ({
      to: f.to,
      from: f.from,
      chunks: f.chunks.map(c => ({
        content: c.content,
        changes: c.changes.map(ch => ({
          type: ch.type,
          content: ch.content,
          ln1: (ch as any).ln1 || (ch as any).ln, // parse-diff types might vary
          ln2: (ch as any).ln2 || (ch as any).ln
        }))
      }))
    }));

    const reviewer = new Reviewer(diffFiles as any);
    const findings = reviewer.review();

    const output: ReviewOutput = {
      summary: generateMarkdown(findings),
      findings: findings,
      passed: !findings.some(f => f.severity === 'critical')
    };

    // Output JSON
    fs.writeFileSync('review_findings.json', JSON.stringify(output, null, 2));

    // Output Markdown
    fs.writeFileSync('review_findings.md', output.summary);

    process.stdout.write(`${output.summary}\n`);

    if (!output.passed) {
      process.stderr.write('CRITICAL ISSUES FOUND\n');
      process.exit(1);
    }

  } catch (error) {
    process.stderr.write(`Error processing diff: ${error}\n`);
    process.exit(1);
  }
}

main();
