import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function parseArgs(argv) {
  const args = {
    baseline: 'origin/main',
    paths: [
      '.github/workflows',
      'docs/governance',
      'docs/releases',
      'SECURITY_GA_GATE.md'
    ],
    out: 'artifacts/governance_drift_report.json'
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--baseline') {
      args.baseline = argv[++i];
    } else if (arg === '--paths') {
      args.paths = argv[++i].split(',').map(p => p.trim());
    } else if (arg === '--out') {
      args.out = argv[++i];
    }
  }
  return args;
}

function runGitDiff(baseline, paths) {
  try {
    // Check if baseline exists, if not, try 'main' if baseline was 'origin/main'
    try {
      execSync(`git rev-parse --verify "${baseline}"`, { stdio: 'ignore' });
    } catch (e) {
      if (baseline === 'origin/main') {
        try {
            console.warn(`Baseline 'origin/main' not found, falling back to 'main'`);
            execSync(`git rev-parse --verify "main"`, { stdio: 'ignore' });
            baseline = 'main';
        } catch (e2) {
             console.error(`Baseline '${baseline}' and fallback 'main' not found.`);
             process.exit(1);
        }
      } else {
        console.error(`Baseline '${baseline}' not found.`);
        process.exit(1);
      }
    }

    const cmd = `git diff --name-status "${baseline}" HEAD -- ${paths.map(p => `"${p}"`).join(' ')}`;
    const output = execSync(cmd, { encoding: 'utf8' });
    return output.trim().split('\n').filter(line => line.length > 0);
  } catch (error) {
    console.error('Error running git diff:', error.message);
    process.exit(1);
  }
}

function parseDiff(lines) {
  const changes = [];
  const stats = { added: 0, modified: 0, deleted: 0, renamed: 0, unknown: 0 };

  for (const line of lines) {
    const [status, path] = line.split(/\t/);
    let type = 'unknown';
    if (status.startsWith('A')) type = 'added';
    else if (status.startsWith('M')) type = 'modified';
    else if (status.startsWith('D')) type = 'deleted';
    else if (status.startsWith('R')) type = 'renamed';

    if (stats[type] !== undefined) stats[type]++;
    else stats.unknown++;

    changes.push({ path, type, status });
  }

  // Sort for determinism
  changes.sort((a, b) => a.path.localeCompare(b.path));

  return { changes, stats };
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log(`Checking governance drift...`);
  console.log(`Baseline: ${args.baseline}`);
  console.log(`Paths: ${args.paths.join(', ')}`);

  const diffLines = runGitDiff(args.baseline, args.paths);
  const { changes, stats } = parseDiff(diffLines);

  const headDate = execSync('git show -s --format=%cI HEAD', { encoding: 'utf8' }).trim();
  const report = {
    baseline: args.baseline,
    head: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
    timestamp: headDate,
    checked_paths: args.paths,
    summary: stats,
    changed_files: changes
  };

  const outPath = resolve(process.cwd(), args.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`Report written to ${outPath}`);

  if (changes.length > 0) {
    console.error('FAILURE: Governance drift detected!');
    console.error(JSON.stringify(stats, null, 2));
    process.exit(1);
  } else {
    console.log('SUCCESS: No governance drift detected.');
  }
}

main();
