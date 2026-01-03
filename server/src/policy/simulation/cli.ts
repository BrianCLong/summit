import { promises as fs } from 'fs';
import { execSync } from 'node:child_process';
import path from 'path';
import process from 'process';
import { PolicySimulationRunner } from './runner.js';

interface CliOptions {
  baseline: string;
  proposed?: string;
  proposal?: string;
  baselineRef?: string;
  output?: string;
  changedOnly?: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    baseline: 'server/src/policy/fixtures/tenant-baseline.json',
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--baseline':
        options.baseline = argv[++i];
        break;
      case '--proposed':
        options.proposed = argv[++i];
        break;
      case '--proposal':
        options.proposal = argv[++i];
        break;
      case '--baseline-ref':
        options.baselineRef = argv[++i];
        break;
      case '--output':
        options.output = argv[++i];
        break;
      case '--changed-only':
        options.changedOnly = true;
        break;
      default:
        break;
    }
  }

  return options;
}

async function shouldRun(options: CliOptions): Promise<boolean> {
  if (!options.changedOnly) return true;
  try {
    const base = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'origin/main';
    const diff = execSync(`git diff --name-only ${base}...HEAD`, { encoding: 'utf-8' });
    return diff
      .split('\n')
      .some((file) =>
        file.match(
          /(server\/src\/policy|testpacks\/analytics|testpacks\/anomalies|proposals\/.+|out\/proposals\/.+|policy)/,
        ),
      );
  } catch (error) {
    return true;
  }
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const shouldExecute = await shouldRun(options);
  if (!shouldExecute) {
    console.log('No policy or proposal changes detected; skipping policy simulation.');
    process.exit(0);
  }

  const runner = new PolicySimulationRunner({
    baselineBundlePath: options.baseline,
    proposedBundlePath: options.proposed,
    proposalPath: options.proposal,
    baselineRef: options.baselineRef,
  });

  const report = await runner.run();
  const outputPath = options.output || path.join(process.cwd(), 'policy-simulation-report.json');
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log(`Policy simulation complete. Recommendation: ${report.recommendation.decision}`);
  console.log(`Report written to ${outputPath}`);

  if (report.recommendation.decision === 'reject') {
    process.exit(2);
  }
  if (report.recommendation.decision === 'needs_review') {
    process.exit(1);
  }
  process.exit(0);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(3);
});
