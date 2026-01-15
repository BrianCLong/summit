import { execFileSync } from 'child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

const DEFAULT_OUTPUT_ROOT = 'artifacts/agentic';

const parseArgs = (argv) => {
  const options = {
    task: null,
    runId: null,
    mode: 'plan',
    inputPath: null,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    commands: [],
    includeDiff: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--task') {
      options.task = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--run-id') {
      options.runId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--mode') {
      options.mode = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--input') {
      options.inputPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--output-root') {
      options.outputRoot = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--command') {
      options.commands.push(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--include-diff') {
      options.includeDiff = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.task) {
    throw new Error('Missing required --task argument.');
  }

  return options;
};

const stableSortObject = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => stableSortObject(entry));
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = stableSortObject(value[key]);
        return acc;
      }, {});
  }
  return value;
};

const stableStringify = (value) => `${JSON.stringify(stableSortObject(value), null, 2)}\n`;

const readJsonIfPresent = (inputPath) => {
  if (!inputPath) {
    return {};
  }
  const content = readFileSync(inputPath, 'utf8');
  return JSON.parse(content);
};

const safeExec = (command, args) => {
  try {
    return execFileSync(command, args, { encoding: 'utf8' }).trim();
  } catch (error) {
    return 'unavailable';
  }
};

const renderReportMarkdown = (report) => {
  const lines = [
    '# Agentic Evidence Report',
    '',
    `- Task: ${report.task}`,
    `- Mode: ${report.mode}`,
    `- Git SHA: ${report.git.sha}`,
    `- Branch: ${report.git.branch}`,
    `- Working Tree Clean: ${report.git.status.clean}`,
    '',
    '## Inputs',
    '```json',
    JSON.stringify(report.inputs, null, 2),
    '```',
    '',
    '## Commands',
  ];

  if (report.commands.length === 0) {
    lines.push('- None recorded');
  } else {
    report.commands.forEach((command) => {
      lines.push(`- ${command}`);
    });
  }

  lines.push('', '## Artifacts', '```json');
  lines.push(JSON.stringify(report.artifacts, null, 2));
  lines.push('```', '');

  return `${lines.join('\n')}\n`;
};

const options = parseArgs(process.argv.slice(2));
const gitSha = safeExec('git', ['rev-parse', 'HEAD']);
const gitBranch = safeExec('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
const statusLines = safeExec('git', ['status', '--porcelain'])
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .sort();

const runId =
  options.runId || process.env.AGENTIC_RUN_ID || process.env.GITHUB_RUN_ID || gitSha;

const outputDir = join(options.outputRoot, options.task, String(runId));
mkdirSync(outputDir, { recursive: true });

const inputData = readJsonIfPresent(options.inputPath);
const artifacts = {
  root: relative(process.cwd(), outputDir),
  stamp: 'stamp.json',
  report_json: 'report.json',
  report_md: 'report.md',
  provenance_json: 'provenance.json',
  diffs_patch: options.includeDiff ? 'diffs.patch' : null,
};

const report = {
  schema_version: 1,
  task: options.task,
  mode: options.mode,
  inputs: inputData,
  commands: options.commands,
  git: {
    sha: gitSha,
    branch: gitBranch,
    status: {
      clean: statusLines.length === 0,
      entries: statusLines,
    },
  },
  artifacts,
};

const provenance = {
  schema_version: 1,
  task: options.task,
  mode: options.mode,
  run_id: String(runId),
  git: {
    sha: gitSha,
    branch: gitBranch,
    status_entries: statusLines,
  },
  tool_versions: {
    node: process.version,
    pnpm: safeExec('pnpm', ['--version']),
    git: safeExec('git', ['--version']),
  },
  commands: options.commands,
  environment: {
    ci: process.env.CI === 'true',
  },
};

const stamp = {
  schema_version: 1,
  task: options.task,
  mode: options.mode,
  run_id: String(runId),
  generated_at: new Date().toISOString(),
  actor: process.env.GITHUB_ACTOR || 'local',
};

writeFileSync(join(outputDir, 'report.json'), stableStringify(report));
writeFileSync(join(outputDir, 'report.md'), renderReportMarkdown(report));
writeFileSync(join(outputDir, 'provenance.json'), stableStringify(provenance));
writeFileSync(join(outputDir, 'stamp.json'), stableStringify(stamp));

if (options.includeDiff) {
  const diff = safeExec('git', ['diff']);
  if (diff && diff !== 'unavailable') {
    writeFileSync(join(outputDir, 'diffs.patch'), `${diff}\n`);
  }
}

console.log(`Agentic evidence bundle written to ${outputDir}`);
