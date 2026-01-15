import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const DEFAULT_ROOT = 'artifacts/agentic';

const parseArgs = (argv) => {
  const options = {
    root: DEFAULT_ROOT,
    path: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--root') {
      options.root = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--path') {
      options.path = argv[i + 1];
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
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

const containsForbiddenKeys = (value, forbidden) => {
  if (Array.isArray(value)) {
    return value.some((entry) => containsForbiddenKeys(entry, forbidden));
  }
  if (value && typeof value === 'object') {
    return Object.keys(value).some(
      (key) => forbidden.includes(key) || containsForbiddenKeys(value[key], forbidden),
    );
  }
  return false;
};

const listEvidenceDirs = (rootDir) => {
  const taskDirs = readdirSync(rootDir)
    .map((name) => join(rootDir, name))
    .filter((path) => statSync(path).isDirectory());

  const runDirs = taskDirs.flatMap((taskDir) =>
    readdirSync(taskDir)
      .map((name) => join(taskDir, name))
      .filter((path) => statSync(path).isDirectory()),
  );

  return runDirs.sort();
};

const options = parseArgs(process.argv.slice(2));
const evidenceDirs = options.path ? [options.path] : listEvidenceDirs(options.root);

if (evidenceDirs.length === 0) {
  throw new Error(`No evidence directories found under ${options.root}`);
}

const requiredFiles = ['stamp.json', 'report.json', 'report.md', 'provenance.json'];
const forbiddenKeys = ['generated_at', 'timestamp', 'run_id', 'runId'];

const failures = [];

evidenceDirs.forEach((dir) => {
  requiredFiles.forEach((file) => {
    const filePath = join(dir, file);
    try {
      statSync(filePath);
    } catch (error) {
      failures.push(`${dir}: missing ${file}`);
    }
  });

  const reportPath = join(dir, 'report.json');
  let reportContent;
  let report;
  try {
    reportContent = readFileSync(reportPath, 'utf8');
    report = JSON.parse(reportContent);
  } catch (error) {
    failures.push(`${dir}: report.json unreadable`);
    return;
  }

  if (containsForbiddenKeys(report, forbiddenKeys)) {
    failures.push(`${dir}: report.json contains non-deterministic keys`);
  }

  const expectedReport = stableStringify(report);
  if (reportContent !== expectedReport) {
    failures.push(`${dir}: report.json is not deterministically ordered`);
  }

  const reportMdPath = join(dir, 'report.md');
  try {
    const reportMd = readFileSync(reportMdPath, 'utf8');
    const expectedReportMd = renderReportMarkdown(report);
    if (reportMd !== expectedReportMd) {
      failures.push(`${dir}: report.md does not match report.json`);
    }
  } catch (error) {
    failures.push(`${dir}: report.md unreadable`);
  }

  if (report.artifacts?.diffs_patch) {
    const diffPath = join(dir, report.artifacts.diffs_patch);
    try {
      statSync(diffPath);
    } catch (error) {
      failures.push(`${dir}: diffs.patch missing while referenced`);
    }
  }
});

if (failures.length > 0) {
  console.error('Agentic evidence verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Agentic evidence verification passed for ${evidenceDirs.length} bundle(s).`);
