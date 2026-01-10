import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const SCORECARD_PATH = path.join(ROOT_DIR, 'docs/security/SECURITY_SCORECARD.json');

// Helper to run shell commands safely
const run = (cmd: string): string | null => {
  try {
    return execSync(cmd, { cwd: ROOT_DIR, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (e) {
    return null;
  }
};

interface Scorecard {
  overall_score: number;
  last_updated?: string;
  metrics: {
    authentication_coverage: { score: number; details: string };
    secrets_management: { score: number; issues: string[] };
    input_validation_coverage: { score: number; details: string };
    repo_hygiene?: { score: number; details: string };
    test_coverage?: { score: number; details: string };
  };
}

const loadScorecard = (): Scorecard => {
  if (fs.existsSync(SCORECARD_PATH)) {
    return JSON.parse(fs.readFileSync(SCORECARD_PATH, 'utf-8'));
  }
  return {
    overall_score: 0,
    metrics: {
      authentication_coverage: { score: 0, details: 'N/A' },
      secrets_management: { score: 0, issues: [] },
      input_validation_coverage: { score: 0, details: 'N/A' },
    },
  };
};

// Check for committed secrets (heuristic)
const checkSecrets = (): { score: number; issues: string[] } => {
  const issues: string[] = [];
  const riskyFiles = ['.env', 'secrets.json', 'credentials.txt'];

  riskyFiles.forEach(file => {
    if (fs.existsSync(path.join(ROOT_DIR, file))) {
      issues.push(`Found committed sensitive file: ${file}`);
    }
  });

  // Simple grep for obvious tokens (very basic)
  const grepResult = run('grep -r "ghp_" . --include="*.ts" --exclude-dir="node_modules" --max-count=1');
  if (grepResult) {
    issues.push('Potential GitHub token found in source code');
  }

  // Calculate score (start at 100, deduct for issues)
  const score = Math.max(0, 100 - (issues.length * 30));
  return { score, issues };
};

// Check repo hygiene
const checkHygiene = (): { score: number; details: string } => {
  const status = run('git status --porcelain');
  const untrackedCount = status ? status.split('\n').filter(l => l.startsWith('??')).length : 0;
  const modifiedCount = status ? status.split('\n').filter(l => !l.startsWith('??')).length : 0;

  let score = 100;
  let details = 'Clean repo';

  if (untrackedCount > 0 || modifiedCount > 0) {
    score = Math.max(0, 100 - ((untrackedCount + modifiedCount) * 10));
    details = `${untrackedCount} untracked, ${modifiedCount} modified files`;
  }

  return { score, details };
};

// Check test coverage (if report exists)
const checkCoverage = (): { score: number; details: string } => {
  const summaryPath = path.join(ROOT_DIR, 'coverage/coverage-summary.json');
  if (fs.existsSync(summaryPath)) {
    try {
      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
      const total = summary.total?.lines?.pct || 0;
      return { score: total, details: `${total}% line coverage` };
    } catch (e) {
      return { score: 0, details: 'Coverage report parse error' };
    }
  }
  return { score: 0, details: 'No coverage report found' };
};

const main = () => {
  console.log('Updating Security Scorecard...');
  const current = loadScorecard();

  const secrets = checkSecrets();
  const hygiene = checkHygiene();
  const coverage = checkCoverage();

  // Update metrics
  current.metrics.secrets_management = secrets;
  current.metrics.repo_hygiene = hygiene;
  if (coverage.score > 0) {
    current.metrics.test_coverage = coverage;
  }

  // Recalculate overall score (weighted average)
  // Weights: Auth=30%, Secrets=30%, Input=20%, Hygiene=10%, Coverage=10%
  const wAuth = current.metrics.authentication_coverage?.score || 0;
  const wSecrets = secrets.score;
  const wInput = current.metrics.input_validation_coverage?.score || 0;
  const wHygiene = hygiene.score;
  const wCoverage = coverage.score;

  // Adjust weights if metrics are missing
  // Simplified for now: just average present metrics
  const scores = [wAuth, wSecrets, wInput, wHygiene, wCoverage].filter(s => s > 0);
  const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  current.overall_score = parseFloat(avg.toFixed(2));
  current.last_updated = new Date().toISOString();

  fs.writeFileSync(SCORECARD_PATH, JSON.stringify(current, null, 2));
  console.log(`Scorecard updated. Overall Score: ${current.overall_score}`);
  console.log(`Issues found: ${secrets.issues.length}`);
};

main();
