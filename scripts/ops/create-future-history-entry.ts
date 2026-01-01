#!/usr/bin/env npx ts-node --esm
/**
 * Future History Entry Creator
 *
 * Creates or appends Future History entries from PR information.
 *
 * Usage:
 *   pnpm future-history:create --pr 13347 --summary "Security scanning pipeline"
 *   pnpm future-history:create --pr 13347 --pr 13348 --summary "Performance optimization"
 *   pnpm future-history:create --interactive
 *
 * Options:
 *   --pr <number>       PR number(s) to include (can be repeated)
 *   --summary <text>    Short summary of the change
 *   --category <cat>    Category (Security, Performance, etc.)
 *   --owner <team>      Team or person responsible
 *   --output <path>     Output file (default: docs/future-history/LOG.md)
 *   --standalone        Create standalone file instead of appending to LOG.md
 *   --interactive       Interactive mode with prompts
 *   --dry-run           Print entry without writing
 *   --help              Show help
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Types
interface PRInfo {
  number: number;
  title: string;
  body: string;
  author: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  mergedAt: string | null;
  labels: string[];
  url: string;
}

interface EntryOptions {
  prs: number[];
  summary: string;
  category: string;
  owner: string;
  output: string;
  standalone: boolean;
  dryRun: boolean;
}

// Constants
const CATEGORIES = [
  'Security',
  'Performance',
  'Governance',
  'Architecture',
  'Strategy',
  'Infrastructure',
  'API',
  'Data',
];

const LOG_PATH = 'docs/future-history/LOG.md';
const STANDALONE_DIR = 'docs/future-history/entries';

// Utility functions
function parseArgs(): EntryOptions & { interactive: boolean; help: boolean } {
  const args = process.argv.slice(2);
  const options: EntryOptions & { interactive: boolean; help: boolean } = {
    prs: [],
    summary: '',
    category: '',
    owner: '',
    output: LOG_PATH,
    standalone: false,
    dryRun: false,
    interactive: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--pr':
        options.prs.push(parseInt(args[++i], 10));
        break;
      case '--summary':
        options.summary = args[++i];
        break;
      case '--category':
        options.category = args[++i];
        break;
      case '--owner':
        options.owner = args[++i];
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--standalone':
        options.standalone = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--interactive':
        options.interactive = true;
        break;
      case '--help':
        options.help = true;
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
Future History Entry Creator

Creates or appends Future History entries from PR information.

Usage:
  pnpm future-history:create --pr 13347 --summary "Security scanning pipeline"
  pnpm future-history:create --pr 13347 --pr 13348 --summary "Performance optimization"
  pnpm future-history:create --interactive

Options:
  --pr <number>       PR number(s) to include (can be repeated)
  --summary <text>    Short summary of the change
  --category <cat>    Category: ${CATEGORIES.join(', ')}
  --owner <team>      Team or person responsible
  --output <path>     Output file (default: ${LOG_PATH})
  --standalone        Create standalone file instead of appending to LOG.md
  --dry-run           Print entry without writing
  --interactive       Interactive mode with prompts
  --help              Show help

Examples:
  # Create entry from single PR
  pnpm future-history:create --pr 13347 --summary "Add security scanning" --category Security

  # Create entry from multiple PRs
  pnpm future-history:create --pr 13347 --pr 13348 --summary "Performance optimization" --category Performance

  # Interactive mode
  pnpm future-history:create --interactive

  # Preview without writing
  pnpm future-history:create --pr 13347 --summary "Test" --dry-run
`);
}

async function fetchPRInfo(prNumber: number): Promise<PRInfo | null> {
  try {
    // Try using gh CLI if available
    const result = execSync(
      `gh pr view ${prNumber} --json number,title,body,author,additions,deletions,changedFiles,mergedAt,labels,url 2>/dev/null`,
      { encoding: 'utf-8', timeout: 10000 },
    );
    const data = JSON.parse(result);
    return {
      number: data.number,
      title: data.title,
      body: data.body || '',
      author: data.author?.login || 'unknown',
      additions: data.additions || 0,
      deletions: data.deletions || 0,
      changedFiles: data.changedFiles || 0,
      mergedAt: data.mergedAt,
      labels: (data.labels || []).map((l: { name: string }) => l.name),
      url: data.url,
    };
  } catch {
    // gh CLI not available or PR not found, create placeholder
    console.warn(
      `Warning: Could not fetch PR #${prNumber} info. Using placeholder.`,
    );
    return {
      number: prNumber,
      title: `PR #${prNumber}`,
      body: '',
      author: 'unknown',
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      mergedAt: null,
      labels: [],
      url: `https://github.com/BrianCLong/summit/pull/${prNumber}`,
    };
  }
}

function inferCategory(prInfo: PRInfo[]): string {
  const labels = prInfo.flatMap((pr) => pr.labels.map((l) => l.toLowerCase()));
  const titles = prInfo.map((pr) => pr.title.toLowerCase()).join(' ');
  const bodies = prInfo.map((pr) => pr.body.toLowerCase()).join(' ');
  const combined = [...labels, titles, bodies].join(' ');

  if (
    combined.includes('security') ||
    combined.includes('auth') ||
    combined.includes('vuln')
  ) {
    return 'Security';
  }
  if (
    combined.includes('perf') ||
    combined.includes('optim') ||
    combined.includes('latency')
  ) {
    return 'Performance';
  }
  if (
    combined.includes('governance') ||
    combined.includes('compliance') ||
    combined.includes('audit')
  ) {
    return 'Governance';
  }
  if (
    combined.includes('architect') ||
    combined.includes('refactor') ||
    combined.includes('migration')
  ) {
    return 'Architecture';
  }
  if (
    combined.includes('ci') ||
    combined.includes('cd') ||
    combined.includes('deploy') ||
    combined.includes('infra')
  ) {
    return 'Infrastructure';
  }
  if (
    combined.includes('graphql') ||
    combined.includes('api') ||
    combined.includes('endpoint')
  ) {
    return 'API';
  }
  if (
    combined.includes('database') ||
    combined.includes('data') ||
    combined.includes('schema')
  ) {
    return 'Data';
  }

  return 'Architecture'; // Default
}

function generateDiffSummary(prInfo: PRInfo[]): string {
  const totalAdditions = prInfo.reduce((sum, pr) => sum + pr.additions, 0);
  const totalDeletions = prInfo.reduce((sum, pr) => sum + pr.deletions, 0);
  const totalFiles = prInfo.reduce((sum, pr) => sum + pr.changedFiles, 0);

  return `+${totalAdditions}/-${totalDeletions} across ${totalFiles} files`;
}

function generateEntry(options: EntryOptions, prInfo: PRInfo[]): string {
  const date = new Date().toISOString().split('T')[0];
  const title = options.summary || prInfo.map((pr) => pr.title).join('; ');
  const category = options.category || inferCategory(prInfo);
  const owner = options.owner || 'Engineering Team';
  const diffSummary = generateDiffSummary(prInfo);

  const prLinks = prInfo.map((pr) => `#${pr.number}`).join(', ');

  const prDescriptions = prInfo
    .map((pr) => `- **PR #${pr.number}**: ${pr.title}`)
    .join('\n');

  return `
### ${date}: ${title}

**Category**: ${category} | **Status**: Draft | **Owner**: ${owner}

#### Change/Decision

<!-- Describe what changed. Be specific about technical changes. -->
${prDescriptions}

**Diff Summary**: ${diffSummary}

<!-- TODO: Add 1-2 paragraphs describing the change in detail -->

#### Rationale

<!-- Why did we make this change? What problem were we solving? -->

<!-- TODO: Fill in rationale -->

#### Short-term Effects (0–3 months)

- **Immediate**: <!-- What happens right away -->
- **Week 1-2**: <!-- Early effects -->
- **Month 1**: <!-- First month outcomes -->
- **Month 2-3**: <!-- Near-term stabilization -->

#### Long-term Effects (6–24 months)

- **6 months**: <!-- Half-year trajectory -->
- **12 months**: <!-- One-year vision -->
- **18 months**: <!-- Extended trajectory -->
- **24 months**: <!-- Two-year strategic outcome -->

#### Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| <!-- Risk 1 --> | <!-- L/M/H --> | <!-- L/M/H --> | <!-- Mitigation --> |
| <!-- Risk 2 --> | <!-- L/M/H --> | <!-- L/M/H --> | <!-- Mitigation --> |

#### Links

- **PR**: ${prLinks}
- **ADR**: N/A <!-- Link ADR if applicable -->
- **Threat Model**: N/A <!-- Link threat model if applicable -->
- **Health Score**: N/A <!-- Link to relevant metrics -->
`;
}

function generateIndexEntry(options: EntryOptions, prInfo: PRInfo[]): string {
  const date = new Date().toISOString().split('T')[0];
  const title = options.summary || prInfo.map((pr) => pr.title).join('; ');
  const category = options.category || inferCategory(prInfo);
  const anchor = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

  return `| ${date} | [${title}](#${date}-${anchor}) | ${category} | Draft |`;
}

function appendToLog(entry: string, indexEntry: string, logPath: string): void {
  const fullPath = path.resolve(process.cwd(), logPath);

  if (!fs.existsSync(fullPath)) {
    console.error(`Error: Log file not found at ${fullPath}`);
    console.error('Please ensure docs/future-history/LOG.md exists.');
    process.exit(1);
  }

  let content = fs.readFileSync(fullPath, 'utf-8');

  // Find the index table and add new entry
  const indexMarker = '|------|-------|----------|--------|';
  const indexPosition = content.indexOf(indexMarker);
  if (indexPosition !== -1) {
    const insertPosition = content.indexOf('\n', indexPosition) + 1;
    content =
      content.slice(0, insertPosition) +
      indexEntry +
      '\n' +
      content.slice(insertPosition);
  }

  // Find the entries section and add new entry
  const entriesMarker = '## Entries';
  const entriesPosition = content.indexOf(entriesMarker);
  if (entriesPosition !== -1) {
    const insertPosition = content.indexOf('\n\n', entriesPosition) + 2;
    content =
      content.slice(0, insertPosition) +
      entry +
      '\n---\n' +
      content.slice(insertPosition);
  }

  fs.writeFileSync(fullPath, content);
  console.log(`Entry added to ${fullPath}`);
}

function writeStandaloneEntry(entry: string, options: EntryOptions): string {
  const date = new Date().toISOString().split('T')[0];
  const slug = options.summary
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);

  const dirPath = path.resolve(process.cwd(), STANDALONE_DIR);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const filename = `${date}-${slug}.md`;
  const fullPath = path.join(dirPath, filename);

  const header = `# Future History Entry: ${options.summary}\n\n> **Created**: ${date}\n> **Status**: Draft - Pending merge to LOG.md\n`;

  fs.writeFileSync(fullPath, header + entry);
  console.log(`Standalone entry created at ${fullPath}`);
  return fullPath;
}

async function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function interactiveMode(): Promise<EntryOptions> {
  console.log('\n=== Future History Entry Creator (Interactive Mode) ===\n');

  const prInput = await promptUser(
    'PR number(s) (comma-separated, or empty): ',
  );
  const prs = prInput
    ? prInput
        .split(',')
        .map((n) => parseInt(n.trim(), 10))
        .filter((n) => !isNaN(n))
    : [];

  const summary = await promptUser('Summary (short title): ');

  console.log(`\nCategories: ${CATEGORIES.join(', ')}`);
  const category = await promptUser(
    'Category (or press Enter to auto-detect): ',
  );

  const owner = await promptUser(
    'Owner (team or person, default: Engineering Team): ',
  );

  const standaloneInput = await promptUser('Create standalone file? (y/N): ');
  const standalone = standaloneInput.toLowerCase() === 'y';

  const dryRunInput = await promptUser('Dry run (preview only)? (y/N): ');
  const dryRun = dryRunInput.toLowerCase() === 'y';

  return {
    prs,
    summary: summary || 'Untitled Entry',
    category: category || '',
    owner: owner || 'Engineering Team',
    output: LOG_PATH,
    standalone,
    dryRun,
  };
}

// Main execution
async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  let options: EntryOptions;

  if (args.interactive) {
    options = await interactiveMode();
  } else {
    if (!args.summary && args.prs.length === 0) {
      console.error('Error: --summary or --pr required. Use --help for usage.');
      process.exit(1);
    }
    options = args;
  }

  // Fetch PR info
  console.log('\nFetching PR information...');
  const prInfoPromises = options.prs.map((pr) => fetchPRInfo(pr));
  const prInfoResults = await Promise.all(prInfoPromises);
  const prInfo = prInfoResults.filter((pr): pr is PRInfo => pr !== null);

  // Generate entry
  const entry = generateEntry(options, prInfo);
  const indexEntry = generateIndexEntry(options, prInfo);

  if (options.dryRun) {
    console.log('\n=== DRY RUN - Entry Preview ===\n');
    console.log('Index entry:');
    console.log(indexEntry);
    console.log('\nFull entry:');
    console.log(entry);
    console.log('\n=== End Preview ===');
    return;
  }

  if (options.standalone) {
    writeStandaloneEntry(entry, options);
  } else {
    appendToLog(entry, indexEntry, options.output);
  }

  console.log('\nEntry created successfully!');
  console.log('Next steps:');
  console.log('1. Fill in the TODO placeholders in the entry');
  console.log('2. Review and update the predictions');
  console.log('3. Change status from Draft to Active after review');
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
