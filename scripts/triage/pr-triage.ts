import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { createCommand, logger, handleExit } from '../_lib/cli.js';
import { ArtifactManager } from '../_lib/artifacts.js';

interface PR {
  number: number;
  title: string;
  headRefName: string;
  author: { login: string };
  updatedAt: string;
  labels: { name: string }[];
  checks: { state: string; appName: string }[];
  files?: string[];
}

function getPRs(sourceFile?: string): PR[] {
  if (sourceFile) {
      if (fs.existsSync(sourceFile)) {
          logger.info(`Using provided source file: ${sourceFile}`);
          return JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
      } else {
          throw new Error(`Source file not found: ${sourceFile}`);
      }
  }

  try {
    const cmd = 'gh pr list --state open --json number,title,headRefName,author,updatedAt,labels,checks --limit 50';
    logger.verbose(process.env.VERBOSE === 'true', `Executing: ${cmd}`);
    const output = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    return JSON.parse(output);
  } catch (e) {
    const manualFile = path.join(process.cwd(), 'prs.json');
    if (fs.existsSync(manualFile)) {
      logger.warn('Docs: "gh" CLI not found. Using local prs.json for triage.');
      return JSON.parse(fs.readFileSync(manualFile, 'utf-8'));
    }

    logger.error('Error: "gh" CLI not found and no prs.json provided.');
    logger.info('To fix this:');
    logger.info('  1. Install GitHub CLI: https://cli.github.com/');
    logger.info('  2. Run: gh auth login');
    logger.info('  3. Or provide a valid export via --source prs.json');
    throw new Error('"gh" CLI not available');
  }
}

function analyzePR(pr: PR) {
  let status = 'Unknown';
  let failingChecks: string[] = [];

  const isGreen = pr.checks?.every(c => c.state === 'PASS' || c.state === 'SUCCESS') ?? false;

  if (isGreen) {
      status = 'Merge-ready';
  } else {
      status = 'Needs Inspection';
      failingChecks.push('Check logs');
  }

  if (pr.labels.some(l => l.name === 'blocked')) status = 'Blocked';

  return {
    number: pr.number,
    title: pr.title,
    author: pr.author.login,
    status,
    failingChecks,
    updatedAt: pr.updatedAt
  };
}

async function runTriage(options: any) {
  const { mode, outDir, json, source, verbose } = options;
  const artifactManager = new ArtifactManager(outDir);

  logger.section('Merge Train Triage');
  logger.info(`Mode: ${mode}`);

  const prs = getPRs(source);
  logger.info(`Loaded ${prs.length} PRs.`);

  const analyzed = prs.map(analyzePR);
  analyzed.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  // In plan mode, we just print the table to stdout
  if (mode === 'plan') {
    logger.section('Triage Plan (Dry Run)');
    console.table(analyzed.map(p => ({
        id: `#${p.number}`,
        status: p.status,
        author: p.author,
        updated: new Date(p.updatedAt).toLocaleDateString()
    })));
    return;
  }

  // Apply mode: Generate Artifacts
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runDirName = `merge-train-${timestamp}`;
  const runDir = artifactManager.ensureDir(path.join('merge-train', runDirName));

  // Write detailed JSON
  const reportPath = path.join(runDir, 'triage-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(analyzed, null, 2));

  // Write Markdown Summary
  const mdPath = path.join(runDir, 'triage-summary.md');
  const mdContent = `# Merge Train Triage Report
Generated: ${new Date().toISOString()}

| PR | Status | Author | Updated |
| :--- | :--- | :--- | :--- |
${analyzed.map(pr => `| #${pr.number} ${pr.title.slice(0, 40)}... | ${pr.status} | ${pr.author} | ${new Date(pr.updatedAt).toLocaleDateString()} |`).join('\n')}

## Action Items
- **Merge-ready**: Review and merge immediately.
- **Blocked**: Check specific failures using \`pnpm ci:cluster\`.
`;
  fs.writeFileSync(mdPath, mdContent);

  logger.success(`Triage report generated at: ${runDir}`);
  logger.info(`  - JSON: ${reportPath}`);
  logger.info(`  - Markdown: ${mdPath}`);

  if (json) {
      logger.json({
          status: 'success',
          artifacts: {
              report: reportPath,
              summary: mdPath
          },
          summary: analyzed
      });
  }
}

const program = createCommand('pr:triage', 'Analyzes PRs for merge train eligibility');

program
  .option('--source <file>', 'Path to local prs.json file for offline mode')
  .action(async (options) => {
    await runTriage(options);
  });

program.parse(process.argv);
