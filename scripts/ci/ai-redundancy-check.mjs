import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * AI Redundancy Check Gate
 *
 * Implements MSR '26 research-backed governance for AI-authored code.
 * Detects Type-4 clones and enforces the Max-Redundancy-Score (LRS).
 */

const MAX_LOCAL_REDUNDANCY = 2.0;

function run() {
  const prBody = process.env.GITHUB_PR_BODY || '';
  const isAIAuthored = prBody.includes('<!-- AGENT-METADATA:START -->') ||
                       prBody.toLowerCase().includes('ai-generated') ||
                       prBody.toLowerCase().includes('authored by');

  if (!isAIAuthored) {
    console.log('PR not identified as AI-authored. Skipping redundancy gate.');
    process.exit(0);
  }

  console.log('AI-authored PR detected. Running Max-Redundancy-Score gate (LRS)...');

  try {
    // Get list of changed files in the PR
    const baseRef = process.env.GITHUB_BASE_REF || 'main';

    let changedFiles = [];
    try {
      changedFiles = execFileSync('git', ['diff', '--name-only', `origin/${baseRef}...`], { encoding: 'utf8' })
        .split('\n')
        .filter(f => f && fs.existsSync(f) && (f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.py') || f.endsWith('.jsx') || f.endsWith('.tsx')));
    } catch (e) {
      console.warn('Could not determine changed files via git diff. Falling back to HEAD~1...');
      changedFiles = execFileSync('git', ['diff', '--name-only', 'HEAD~1'], { encoding: 'utf8' })
        .split('\n')
        .filter(f => f && fs.existsSync(f) && (f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.py') || f.endsWith('.jsx') || f.endsWith('.tsx')));
    }

    if (changedFiles.length === 0) {
      console.log('No relevant source files changed. Gate passed.');
      process.exit(0);
    }

    console.log(`Checking redundancy in ${changedFiles.length} files...`);

    const reportDir = path.join(process.cwd(), 'jscpd-report');
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir);

    // Use pnpm exec jscpd (since we added it to devDependencies)
    execFileSync('pnpm', [
      'exec',
      'jscpd',
      ...changedFiles,
      '--threshold', '10',
      '--reporters', 'json',
      '--output', 'jscpd-report',
      '--silent'
    ], { encoding: 'utf8' });

    const reportPath = path.join(reportDir, 'jscpd-report.json');
    if (!fs.existsSync(reportPath)) {
      console.error('Failed to generate redundancy report.');
      process.exit(1);
    }

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const totalPercentage = report.statistics.total.percentage;

    console.log(`PR Local Redundancy Score (LRS): ${totalPercentage}%`);

    if (totalPercentage > MAX_LOCAL_REDUNDANCY) {
      console.error(`❌ Redundancy Score ${totalPercentage}% exceeds threshold of ${MAX_LOCAL_REDUNDANCY}%`);
      console.error('AI-authored code shows high semantic redundancy (Type-4 clones) within the changed files.');
      console.error('Please refactor to use existing utilities or consolidate logic.');
      process.exit(1);
    }

    console.log('✅ Max-Redundancy-Score gate passed.');
  } catch (error) {
    console.error('Error running redundancy check:', error.message);
    if (error.stdout) console.error('Stdout:', error.stdout);
    if (error.stderr) console.error('Stderr:', error.stderr);
    process.exit(1);
  }
}

run();
