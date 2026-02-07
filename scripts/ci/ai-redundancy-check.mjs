import fs from 'node:fs';
import path from 'node:path';
import { execSync, execFileSync } from 'node:child_process';

/**
 * AI Redundancy Check Gate
 *
 * This script enforces the Max-Redundancy-Score for AI-authored PRs.
 * It also generates reviewer awareness prompts based on MSR '26 research.
 */

const START_MARKER = '<!-- AGENT-METADATA:START -->';
const END_MARKER = '<!-- AGENT-METADATA:END -->';
const LOCAL_THRESHOLD = 2.0; // 2% local redundancy

function log(msg) {
  // eslint-disable-next-line no-console
  console.log(`[AI-Redundancy-Check] ${msg}`);
}

function extractMetadata(body) {
  if (!body) {
    return null;
  }
  const startIndex = body.indexOf(START_MARKER);
  const endIndex = body.indexOf(END_MARKER);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return null;
  }
  return true; // We just need to know if it's there for this check
}

function getChangedFiles() {
  try {
    // In CI, GITHUB_BASE_REF and GITHUB_HEAD_REF are usually available
    const base = process.env.GITHUB_BASE_REF || 'main';
    const output = execSync(`git diff --name-only origin/${base}...HEAD`, { encoding: 'utf8' });
    return output.trim().split('\n').filter(f => f.match(/\.(ts|js|tsx|jsx)$/));
  } catch (e) {
    log(`Warning: Could not get changed files via git: ${e.message}`);
    return [];
  }
}

function runJscpd(files) {
  if (files.length === 0) {
    return { percentage: 0, duplicates: [] };
  }

  const tempDir = './.jscpd-ai-temp';
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  // We run jscpd on the specific files
  // Stricter thresholds for AI code as per policy
  // Use execFileSync to avoid command injection
  const args = [
    'jscpd',
    ...files,
    '--min-tokens', '20',
    '--min-lines', '5',
    '--reporters', 'json',
    '--output', tempDir,
    '--ignore', '**/*.test.*,**/*.spec.*'
  ];

  try {
    execFileSync('npx', args, { stdio: 'pipe' });
  } catch (_e) {
    // jscpd exits with non-zero if duplicates found, but we want to parse the JSON
  }

  const reportPath = path.join(tempDir, 'jscpd-report.json');
  if (fs.existsSync(reportPath)) {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const result = {
      percentage: report.statistics?.total?.percentage || 0,
      duplicates: report.duplicates || []
    };
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
    return result;
  }

  return { percentage: 0, duplicates: [] };
}

function generateReviewerPrompt(isAI, redundancyScore) {
  let prompt = `## 🤖 AI Code Quality Analysis\n\n`;

  if (isAI) {
    prompt += `**Status:** ⚠️ AI-authored PR detected.\n\n`;
    prompt += `> **Research Alert (MSR '26):** AI agents tend to produce higher semantic redundancy (Type-4 clones) and can mislead reviewers with surface plausibility.\n\n`;

    prompt += `### 📊 Redundancy Metrics\n`;
    const status = redundancyScore < LOCAL_THRESHOLD ? '✅ PASS' : '❌ FAIL';
    prompt += `- **Local Redundancy Score:** ${redundancyScore.toFixed(2)}% (Threshold: < ${LOCAL_THRESHOLD}%)\n`;
    prompt += `- **Result:** ${status}\n\n`;

    prompt += `### 🧐 Reviewer Guidance\n`;
    prompt += `1. **Verify Logic Uniqueness:** Does this implement logic already present in the codebase?\n`;
    prompt += `2. **Audit Surface Plausibility:** Look beyond standard patterns to ensure deep maintainability.\n`;
    prompt += `3. **Assess Reuse:** Can this be moved to a shared package?\n`;
  } else {
    prompt += `**Status:** 👤 Human-authored PR.\n`;
    prompt += `*Standard quality gates apply.*\n`;
  }

  return prompt;
}

function main() {
  // Read body from environment variable directly or from a file if provided
  let body = process.env.PR_BODY || '';
  const prBodyPath = process.env.PR_BODY_PATH;

  if (!body && prBodyPath && fs.existsSync(prBodyPath)) {
    body = fs.readFileSync(prBodyPath, 'utf8');
  }

  const isAI = extractMetadata(body);
  const changedFiles = getChangedFiles();

  log(`Detected ${changedFiles.length} relevant changed files.`);

  const redundancy = runJscpd(changedFiles);
  const prompt = generateReviewerPrompt(isAI, redundancy.percentage);

  // eslint-disable-next-line no-console
  console.log(prompt);

  // Write to a file for CI to use (e.g. as a PR comment)
  fs.writeFileSync('ai-redundancy-report.md', prompt);

  if (isAI && redundancy.percentage >= LOCAL_THRESHOLD) {
    log(`FAIL: Redundancy score ${redundancy.percentage.toFixed(2)}% exceeds threshold ${LOCAL_THRESHOLD}%`);
    process.exit(1);
  }

  log('PASS: Redundancy check successful.');
}

main();
