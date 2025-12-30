import fs from 'node:fs';
import path from 'node:path';

interface Contribution {
  id: string;
  category: 'code' | 'ci' | 'agent' | 'governance';
  weight: number;
  reason: string;
}

interface RiskReport {
  changeId: string;
  score: number;
  band: 'Low' | 'Medium' | 'High' | 'Critical';
  contributions: Contribution[];
  recommendations: string[];
  timestamp: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 1) {
    const [key, value] = args[i].split('=');
    const normalizedKey = key.replace(/^--/, '');
    if (value === undefined) {
      options[normalizedKey] = args[i + 1];
      i += 1;
    } else {
      options[normalizedKey] = value;
    }
  }

  return {
    report: options.report ?? 'risk-report.json',
    pr: options.pr ?? process.env.PR_NUMBER ?? 'unknown',
  };
}

function loadReport(filePath: string): RiskReport {
  const absolute = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(absolute, 'utf8');
  return JSON.parse(raw) as RiskReport;
}

function ensureDecisionArtifact(pr: string): boolean {
  const artifactPath = path.resolve(process.cwd(), `artifacts/risk-decisions/${pr}.json`);
  return fs.existsSync(artifactPath);
}

function requireEnv(name: string, allowed: string[]): boolean {
  const value = process.env[name];
  if (!value) return false;
  return allowed.includes(value.toLowerCase());
}

function main() {
  const { report: reportPath, pr } = parseArgs();
  const report = loadReport(reportPath);

  console.log(`[RISK-ENFORCE] change=${report.changeId} band=${report.band} score=${report.score}`);
  console.log(`[RISK-ENFORCE] factors=${report.contributions.map((c) => c.id).join(',')}`);

  const failures: string[] = [];
  const advisories: string[] = [];

  if (report.band === 'Medium') {
    advisories.push('Recommend targeted tests and validation of touched modules.');
  }

  if (report.band === 'High' || report.band === 'Critical') {
    if (!requireEnv('VERIFICATION_TIER', ['strong', 'paranoid'])) {
      failures.push('VERIFICATION_TIER must be strong or paranoid for High/Critical risk.');
    }

    if (!requireEnv('AGENT_SCOPE', ['narrow'])) {
      failures.push('AGENT_SCOPE must be set to "narrow" when risk is High or Critical.');
    }

    if (!ensureDecisionArtifact(pr)) {
      failures.push(`Decision artifact missing: artifacts/risk-decisions/${pr}.json`);
    }
  }

  if (report.band === 'Critical') {
    failures.push('Critical risk: auto-merge blocked until governance escalation and signed decision artifact are completed.');
  }

  if (failures.length > 0) {
    console.error('[RISK-ENFORCE] Enforcement failures:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
  }

  if (advisories.length > 0) {
    console.log('[RISK-ENFORCE] Advisories:');
    advisories.forEach((advisory) => console.log(`- ${advisory}`));
  }

  if (report.recommendations.length > 0) {
    console.log('[RISK-ENFORCE] Recommendations:');
    report.recommendations.forEach((rec) => console.log(`- ${rec}`));
  }
}

if (require.main === module) {
  main();
}

export { main };
