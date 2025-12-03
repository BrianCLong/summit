import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const COVERAGE_FILENAMES = ['coverage-final.json', 'coverage-summary.json'];
const DEFAULT_SEARCH_ROOTS = ['server', 'services', 'packages', 'apps', 'ga-graphai', 'sdk'];
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.turbo',
  'dist',
  'build',
  '.next',
  '.cache',
  '.venv',
  'venv'
]);

const DEFAULT_LIMIT = 15;
const DEFAULT_OUTPUT = 'reports/test-coverage-heatmap.md';
const DEFAULT_FORMAT = 'markdown';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const coverageFiles = findCoverageFiles(repoRoot, args.roots);
  if (!coverageFiles.length) {
    console.error('No coverage files found. Run tests with coverage enabled first.');
    process.exit(1);
  }

  const fileMetrics = coverageFiles.flatMap((filePath) => parseCoverageFile(filePath));
  if (!fileMetrics.length) {
    console.error('Coverage files were found, but no per-file metrics were parsed.');
    process.exit(1);
  }

  const serviceMetrics = aggregateByService(fileMetrics);
  const generatedAt = new Date().toISOString();
  const outputPath = path.resolve(repoRoot, args.output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  if (args.format === 'json') {
    const payload = buildJsonReport(serviceMetrics, fileMetrics, generatedAt, args.limit);
    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  } else {
    const report = renderReport(serviceMetrics, fileMetrics, generatedAt, args.limit);
    fs.writeFileSync(outputPath, report, 'utf8');
  }

  if (!args.quiet) {
    console.log(`Coverage heatmap written to ${path.relative(repoRoot, outputPath)}`);
    console.log(`Processed ${coverageFiles.length} coverage files and ${fileMetrics.length} file metrics.`);
  }
}

export function parseArgs(argv) {
  const args = {
    output: DEFAULT_OUTPUT,
    format: DEFAULT_FORMAT,
    limit: DEFAULT_LIMIT,
    roots: [...DEFAULT_SEARCH_ROOTS],
    quiet: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--output' && argv[i + 1]) {
      args.output = argv[i + 1];
      i += 1;
    } else if ((token === '--limit' || token === '-l') && argv[i + 1]) {
      args.limit = Number(argv[i + 1]);
      i += 1;
    } else if (token === '--json') {
      args.format = 'json';
    } else if (token === '--roots' && argv[i + 1]) {
      args.roots = argv[i + 1]
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      i += 1;
    } else if (token === '--quiet') {
      args.quiet = true;
    } else if (token === '--help' || token === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp() {
  const lines = [
    'Usage: node scripts/generate-coverage-heatmap.mjs [options]',
    '',
    'Options:',
    `  --output <file>    Output path (default: ${DEFAULT_OUTPUT})`,
    `  --limit <number>   Number of prioritized gaps to show (default: ${DEFAULT_LIMIT})`,
    '  --json             Emit JSON instead of Markdown',
    `  --roots <list>     Comma-separated directories to scan (default: ${DEFAULT_SEARCH_ROOTS.join(',')})`,
    '  --quiet            Silence console output',
    '  -h, --help         Show this help text'
  ];
  console.log(lines.join('\n'));
}

export function findCoverageFiles(repoRoot, roots = DEFAULT_SEARCH_ROOTS) {
  const discovered = new Set();
  const toVisit = roots.map((dir) => path.join(repoRoot, dir)).filter((dir) => fs.existsSync(dir));
  toVisit.push(repoRoot);

  while (toVisit.length) {
    const current = toVisit.pop();
    const stats = fs.statSync(current);
    if (!stats.isDirectory()) {
      continue;
    }

    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) {
          continue;
        }
        toVisit.push(path.join(current, entry.name));
      } else if (COVERAGE_FILENAMES.includes(entry.name)) {
        discovered.add(path.join(current, entry.name));
      }
    }
  }

  return [...discovered];
}

export function parseCoverageFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  const entries = [];

  for (const [fileKey, metrics] of Object.entries(data)) {
    if (fileKey === 'total') {
      continue;
    }

    if (isIstanbulDetail(metrics)) {
      entries.push(buildMetricFromIstanbul(fileKey, metrics, filePath));
      continue;
    }

    if (isIstanbulSummary(metrics)) {
      entries.push(buildMetricFromSummary(fileKey, metrics, filePath));
    }
  }

  return entries;
}

function isIstanbulDetail(metrics) {
  return Boolean(metrics && metrics.s && metrics.b && metrics.f);
}

function isIstanbulSummary(metrics) {
  return Boolean(
    metrics &&
      metrics.statements &&
      metrics.branches &&
      metrics.functions &&
      typeof metrics.statements.covered !== 'undefined'
  );
}

function buildMetricFromIstanbul(fileKey, metrics, sourceFile) {
  const statements = computeCounts(metrics.s);
  const branches = computeCounts(metrics.b, true);
  const functions = computeCounts(metrics.f);
  return buildMetricPayload(fileKey, sourceFile, statements, branches, functions, 'detail');
}

function buildMetricFromSummary(fileKey, metrics, sourceFile) {
  const statements = normalizeSummaryCounts(metrics.statements);
  const branches = normalizeSummaryCounts(metrics.branches);
  const functions = normalizeSummaryCounts(metrics.functions);
  return buildMetricPayload(fileKey, sourceFile, statements, branches, functions, 'summary');
}

function normalizeSummaryCounts(section) {
  return {
    covered: section?.covered ?? 0,
    total: section?.total ?? 0
  };
}

export function computeCounts(counts, isArrayCounts = false) {
  let covered = 0;
  let total = 0;

  for (const value of Object.values(counts)) {
    if (Array.isArray(value)) {
      total += value.length;
      covered += value.filter((hit) => hit > 0).length;
    } else if (isArrayCounts && value && typeof value === 'object') {
      const hits = Array.isArray(value) ? value : Object.values(value);
      total += hits.length;
      covered += hits.filter((hit) => hit > 0).length;
    } else {
      total += 1;
      covered += value > 0 ? 1 : 0;
    }
  }

  return { covered, total };
}

function buildMetricPayload(fileKey, sourceFile, statements, branches, functions, metricSource) {
  const normalizedPath = normalizePath(fileKey);
  const service = deriveService(normalizedPath);
  return {
    service,
    normalizedPath,
    sourceFile,
    statements,
    branches,
    functions,
    metricSource
  };
}

export function normalizePath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const anchors = ['server/', 'services/', 'packages/', 'apps/', 'ga-graphai/', 'sdk/'];
  for (const anchor of anchors) {
    const index = normalized.indexOf(anchor);
    if (index !== -1) {
      return normalized.slice(index);
    }
  }
  return path.basename(normalized);
}

export function deriveService(normalizedPath) {
  const segments = normalizedPath.split('/');
  const anchors = ['services', 'server', 'client', 'packages', 'apps', 'ga-graphai', 'sdk'];
  const anchorIndex = segments.findIndex((segment) => anchors.includes(segment));
  if (anchorIndex === -1) {
    return 'misc';
  }

  const anchor = segments[anchorIndex];
  if (anchor === 'services' && segments[anchorIndex + 1]) {
    return segments[anchorIndex + 1];
  }

  if ((anchor === 'packages' || anchor === 'apps' || anchor === 'ga-graphai') && segments[anchorIndex + 1]) {
    return `${anchor}:${segments[anchorIndex + 1]}`;
  }

  return anchor;
}

export function aggregateByService(fileMetrics) {
  const totals = new Map();
  for (const metric of fileMetrics) {
    const existing = totals.get(metric.service) ?? {
      service: metric.service,
      statements: { covered: 0, total: 0 },
      branches: { covered: 0, total: 0 },
      functions: { covered: 0, total: 0 },
      files: []
    };

    existing.statements.covered += metric.statements.covered;
    existing.statements.total += metric.statements.total;
    existing.branches.covered += metric.branches.covered;
    existing.branches.total += metric.branches.total;
    existing.functions.covered += metric.functions.covered;
    existing.functions.total += metric.functions.total;
    existing.files.push(metric);
    totals.set(metric.service, existing);
  }
  return [...totals.values()].sort((a, b) => coverageScore(a) - coverageScore(b));
}

export function coverageScore(serviceMetric) {
  const stmtRatio = ratio(serviceMetric.statements);
  const branchRatio = ratio(serviceMetric.branches);
  const fnRatio = ratio(serviceMetric.functions);
  return (stmtRatio + branchRatio + fnRatio) / 3;
}

function ratio(section) {
  if (!section.total) {
    return 0;
  }
  return section.covered / section.total;
}

export function renderReport(serviceMetrics, fileMetrics, generatedAt, limit = DEFAULT_LIMIT) {
  const lines = [];
  lines.push('# Test Coverage Heatmap');
  lines.push('');
  lines.push(`Generated: ${generatedAt}`);
  lines.push('');
  lines.push('The heatmap highlights services with coverage gaps based on Istanbul coverage outputs found in the repository.');
  lines.push('');
  lines.push(renderHeatmapTable(serviceMetrics));
  lines.push('');
  lines.push('## Prioritized Coverage Gaps');
  lines.push(renderTopGaps(fileMetrics, limit));
  lines.push('');
  lines.push('## How to Improve');
  lines.push('- Start with the red/orange services; they have the highest uncovered statement counts.');
  lines.push('- Add unit tests for the functions listed in the prioritized gaps to lift statement and branch coverage.');
  lines.push('- Re-run `npm run test:coverage` and this script to refresh the heatmap.');
  lines.push('');
  lines.push('> Generated by `node scripts/generate-coverage-heatmap.mjs`.');
  return lines.join('\n');
}

export function renderHeatmapTable(serviceMetrics) {
  const header = ['Service', 'Statements', 'Branches', 'Functions', 'Heat'];
  const rows = [header.join(' | '), header.map(() => '---').join(' | ')];

  for (const service of serviceMetrics) {
    rows.push(
      [
        service.service,
        formatCoverageCell(service.statements),
        formatCoverageCell(service.branches),
        formatCoverageCell(service.functions),
        heatIndicator(coverageScore(service))
      ].join(' | ')
    );
  }

  return rows.join('\n');
}

export function formatCoverageCell(section) {
  if (!section.total) {
    return '—';
  }
  const percent = ((section.covered / section.total) * 100).toFixed(1);
  return `${percent}% (${section.covered}/${section.total})`;
}

export function heatIndicator(score) {
  if (score >= 0.85) {
    return '🟢 Stable';
  }
  if (score >= 0.7) {
    return '🟡 Watch';
  }
  if (score >= 0.5) {
    return '🟠 Risk';
  }
  return '🔴 Critical';
}

export function renderTopGaps(fileMetrics, limit = DEFAULT_LIMIT) {
  const ranked = [...fileMetrics]
    .map((metric) => ({
      ...metric,
      uncoveredStatements: metric.statements.total - metric.statements.covered,
      uncoveredBranches: metric.branches.total - metric.branches.covered,
      uncoveredFunctions: metric.functions.total - metric.functions.covered,
      statementRatio: ratio(metric.statements)
    }))
    .filter((metric) => metric.statements.total > 0)
    .sort((a, b) => {
      if (b.uncoveredStatements === a.uncoveredStatements) {
        return a.statementRatio - b.statementRatio;
      }
      return b.uncoveredStatements - a.uncoveredStatements;
    })
    .slice(0, limit);

  if (!ranked.length) {
    return '- No gaps detected; coverage data not available.';
  }

  return ranked
    .map((metric, index) => {
      const stmtPercent = metric.statements.total
        ? ((metric.statements.covered / metric.statements.total) * 100).toFixed(1)
        : '0.0';
      const branchPercent = metric.branches.total
        ? ((metric.branches.covered / metric.branches.total) * 100).toFixed(1)
        : '0.0';
      const fnPercent = metric.functions.total
        ? ((metric.functions.covered / metric.functions.total) * 100).toFixed(1)
        : '0.0';
      return `${index + 1}. **${metric.service}** — ${metric.normalizedPath} · statements ${stmtPercent}% (${metric.uncoveredStatements} uncovered), branches ${branchPercent}%, functions ${fnPercent}%`;
    })
    .join('\n');
}

export function buildJsonReport(serviceMetrics, fileMetrics, generatedAt, limit = DEFAULT_LIMIT) {
  return {
    generatedAt,
    services: serviceMetrics.map((service) => ({
      service: service.service,
      statements: service.statements,
      branches: service.branches,
      functions: service.functions,
      score: coverageScore(service),
      heat: heatIndicator(coverageScore(service))
    })),
    prioritizedGaps: buildRankedGaps(fileMetrics, limit)
  };
}

function buildRankedGaps(fileMetrics, limit) {
  return [...fileMetrics]
    .map((metric) => ({
      ...metric,
      uncoveredStatements: metric.statements.total - metric.statements.covered,
      uncoveredBranches: metric.branches.total - metric.branches.covered,
      uncoveredFunctions: metric.functions.total - metric.functions.covered
    }))
    .filter((metric) => metric.statements.total > 0)
    .sort((a, b) => b.uncoveredStatements - a.uncoveredStatements)
    .slice(0, limit);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
