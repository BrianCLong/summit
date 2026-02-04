import fs from 'node:fs/promises';
import path from 'node:path';
import { ScoreSummary } from './types.js';
import { formatDelta, summarizeChecks } from './score.js';

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export const writeMarkdownReport = async (
  outputPath: string,
  summary: ScoreSummary,
): Promise<void> => {
  const checks = summarizeChecks(summary.deterministic, summary.rubric);
  const content = `# Eval Skill Report: ${summary.skill}\n\n` +
    `- Run ID: ${summary.run_id}\n` +
    `- Deterministic Score: ${summary.deterministic.score}\n` +
    `- Rubric Score: ${summary.rubric.score}\n` +
    `- Combined Score: ${summary.combined_score}\n` +
    `- Baseline Delta: ${formatDelta(summary.regression.delta)}\n` +
    `- Checks: ${checks.pass} passed / ${checks.fail} failed\n` +
    `- Overall Pass: ${summary.overall_pass}\n`;
  await fs.writeFile(outputPath, content, 'utf8');
};

export const writeJUnitReport = async (
  outputPath: string,
  summary: ScoreSummary,
): Promise<void> => {
  const checks = [...summary.deterministic.checks, ...summary.rubric.checks];
  const failures = checks.filter((check) => !check.pass).length;
  const casesXml = checks
    .map((check) => {
      const caseName = escapeXml(check.id);
      if (check.pass) {
        return `  <testcase name="${caseName}" />`;
      }
      const message = escapeXml(check.notes ?? 'Check failed');
      return `  <testcase name="${caseName}">\n    <failure message="${message}" />\n  </testcase>`;
    })
    .join('\n');
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<testsuite name="${escapeXml(summary.skill)}" tests="${checks.length}" failures="${failures}">\n` +
    `${casesXml}\n` +
    `</testsuite>\n`;
  await fs.writeFile(outputPath, xml, 'utf8');
};

export const writeSuiteMarkdown = async (
  outputPath: string,
  summaries: ScoreSummary[],
): Promise<void> => {
  const lines = ['# Eval Skills Suite Summary', ''];
  summaries.forEach((summary) => {
    lines.push(
      `- ${summary.skill}: ${summary.combined_score} (pass=${summary.overall_pass}, delta=${formatDelta(
        summary.regression.delta,
      )})`,
    );
  });
  lines.push('');
  await fs.writeFile(outputPath, `${lines.join('\n')}\n`, 'utf8');
};

export const ensureReportDir = async (dir: string): Promise<void> => {
  await fs.mkdir(dir, { recursive: true });
  const keep = path.join(dir, '.keep');
  await fs.writeFile(keep, '');
};
