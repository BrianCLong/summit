#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const TOP_LEVEL_DIRS = new Set(
  fs
    .readdirSync(process.cwd(), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name),
);

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function normalizeFileEntry(file) {
  if (typeof file === 'string') {
    return { filename: file, status: 'modified', additions: 0, deletions: 0, changes: 0, patch: '' };
  }
  return {
    filename: file.filename,
    status: file.status ?? 'modified',
    additions: Number(file.additions ?? 0),
    deletions: Number(file.deletions ?? 0),
    changes: Number(file.changes ?? (Number(file.additions ?? 0) + Number(file.deletions ?? 0))),
    patch: typeof file.patch === 'string' ? file.patch : '',
  };
}

function inferSubsystem(filename) {
  const [first] = filename.split('/');
  if (!first) return 'root';
  if (first.startsWith('.')) return first;
  return first;
}

function inferModule(filename) {
  const parts = filename.split('/');
  if (parts.length <= 1) return parts[0];
  return parts.slice(0, 2).join('/');
}

function parseAddedLines(patch) {
  return patch
    .split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1));
}

function classifyDependency(dep) {
  if (!dep || dep.startsWith('.') || dep.startsWith('/')) {
    return { kind: 'relative', targetSubsystem: null };
  }

  const clean = dep.replace(/^@/, '');
  const first = clean.split('/')[0];
  if (TOP_LEVEL_DIRS.has(first)) {
    return { kind: 'internal', targetSubsystem: first };
  }
  return { kind: 'external', targetSubsystem: null };
}

function extractDependencies(addedLines) {
  const deps = [];
  const matchers = [
    /import\s+[^'";]+\s+from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /require\(['"]([^'"]+)['"]\)/g,
    /from\s+['"]([^'"]+)['"]/g,
    /^\s*from\s+([\w.\-\/]+)/g,
    /^\s*import\s+([\w.\-\/]+)/g,
  ];

  for (const line of addedLines) {
    const pkgJsonMatch = line.match(/^\s*"([^"]+)"\s*:\s*"[^"]+"\s*,?\s*$/);
    if (pkgJsonMatch) deps.push(pkgJsonMatch[1]);

    const cargoMatch = line.match(/^\s*([A-Za-z0-9_\-]+)\s*=\s*"[^"]+"\s*$/);
    if (cargoMatch) deps.push(cargoMatch[1]);

    for (const regex of matchers) {
      regex.lastIndex = 0;
      let match = regex.exec(line);
      while (match) {
        deps.push(match[1]);
        match = regex.exec(line);
      }
    }
  }

  return [...new Set(deps)].sort();
}

function stableWrite(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function formatDependencyRisk(score) {
  if (score >= 0.67) return 'High';
  if (score >= 0.34) return 'Moderate';
  return 'Low';
}

function generateHtmlReport(changeSummary, dependencyImpact, boundaries, riskScore) {
  const esc = (s) => String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

  const subsystemRows = changeSummary.subsystems
    .map((s) => `<tr><td>${esc(s.subsystem)}</td><td>${s.filesTouched}</td></tr>`)
    .join('');

  const depRows = dependencyImpact.newDependencies
    .map((dep) => `<li>${esc(dep)}</li>`)
    .join('');

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>PR Architecture Report</title>
<style>body{font-family:Arial,sans-serif;margin:24px;}table{border-collapse:collapse;}td,th{border:1px solid #ccc;padding:6px 10px;}code{background:#f3f3f3;padding:2px 4px;}</style>
</head>
<body>
<h1>PR Architecture Analysis</h1>
<p><strong>Subsystems Impacted:</strong> ${changeSummary.subsystemsImpacted}</p>
<p><strong>Dependency Risk:</strong> ${dependencyImpact.dependencyRisk}</p>
<p><strong>Architecture Drift:</strong> ${boundaries.architectureDrift}</p>
<p><strong>CI Failure Risk:</strong> +${riskScore.ciFailureRiskPercent}%</p>
<h2>Module Impact Graph (table)</h2>
<table><thead><tr><th>Subsystem</th><th>Files Touched</th></tr></thead><tbody>${subsystemRows}</tbody></table>
<h2>Dependency Changes</h2>
<ul>${depRows || '<li>None</li>'}</ul>
</body></html>`;
}

function analyze(files) {
  const normalizedFiles = files.map(normalizeFileEntry).sort((a, b) => a.filename.localeCompare(b.filename));
  const modules = new Set();
  const subsystemMap = new Map();
  const allDeps = new Set();
  const internalEdges = [];

  for (const file of normalizedFiles) {
    const subsystem = inferSubsystem(file.filename);
    const module = inferModule(file.filename);
    modules.add(module);
    subsystemMap.set(subsystem, (subsystemMap.get(subsystem) ?? 0) + 1);

    const deps = extractDependencies(parseAddedLines(file.patch));
    for (const dep of deps) {
      allDeps.add(dep);
      const classification = classifyDependency(dep);
      if (classification.kind === 'internal' && classification.targetSubsystem) {
        internalEdges.push({
          fromSubsystem: subsystem,
          toSubsystem: classification.targetSubsystem,
          dependency: dep,
        });
      }
    }
  }

  const subsystems = [...subsystemMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([subsystem, filesTouched]) => ({ subsystem, filesTouched }));

  const externalDeps = [...allDeps].filter((dep) => classifyDependency(dep).kind === 'external').sort();
  const dependencyFanOut = {};
  for (const edge of internalEdges) {
    if (!dependencyFanOut[edge.fromSubsystem]) dependencyFanOut[edge.fromSubsystem] = new Set();
    dependencyFanOut[edge.fromSubsystem].add(edge.toSubsystem);
  }

  const fanOutChanges = Object.fromEntries(
    Object.entries(dependencyFanOut)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, v.size]),
  );

  const edgeSet = new Set(internalEdges.map((e) => `${e.fromSubsystem}->${e.toSubsystem}`));
  const circularPairs = [...edgeSet]
    .filter((edge) => {
      const [from, to] = edge.split('->');
      return edgeSet.has(`${to}->${from}`) && from < to;
    })
    .sort();

  const crossSubsystemEdges = internalEdges.filter((e) => e.fromSubsystem !== e.toSubsystem);
  const boundaryViolations = crossSubsystemEdges
    .map((e) => `${e.fromSubsystem} -> ${e.toSubsystem}`)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .sort();

  const complexityIncrease = normalizedFiles.reduce((sum, f) => sum + f.changes, 0);
  const dependencyRiskScore = Math.min(
    1,
    (externalDeps.length * 0.07) + (circularPairs.length * 0.25) + (boundaryViolations.length * 0.06),
  );
  const complexityScore = Math.min(1, complexityIncrease / 1200);
  const boundaryScore = Math.min(1, boundaryViolations.length / 8);
  const totalRiskScore = Number((dependencyRiskScore * 0.45 + boundaryScore * 0.35 + complexityScore * 0.2).toFixed(2));
  const ciFailureRiskPercent = Math.round(totalRiskScore * 22 + boundaryViolations.length * 2);

  return {
    changeSummary: {
      filesModified: normalizedFiles.length,
      modulesAffected: modules.size,
      subsystemsImpacted: subsystems.length,
      subsystems,
      changedFiles: normalizedFiles.map((f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
      })),
    },
    dependencyImpact: {
      newDependencies: externalDeps,
      internalDependencyEdges: crossSubsystemEdges,
      circularDependencyRisk: circularPairs.length > 0 ? 'detected' : 'none-detected',
      circularPairs,
      dependencyFanOutChanges: fanOutChanges,
      dependencyRisk: formatDependencyRisk(dependencyRiskScore),
    },
    architectureBoundaries: {
      subsystemsTouched: subsystems.map((s) => s.subsystem),
      boundaryViolations,
      architectureDrift: boundaryViolations.length > 0 ? 'Increased' : 'Stable',
    },
    riskScore: {
      score: totalRiskScore,
      riskLevel: formatDependencyRisk(totalRiskScore),
      ciFailureRiskPercent,
      factors: {
        dependencyRiskScore: Number(dependencyRiskScore.toFixed(2)),
        boundaryScore: Number(boundaryScore.toFixed(2)),
        complexityScore: Number(complexityScore.toFixed(2)),
      },
    },
  };
}

function toSummaryMarkdown(result) {
  return [
    'PR Architecture Analysis',
    '------------------------',
    `Subsystems Impacted: ${result.changeSummary.subsystemsImpacted}`,
    `Dependency Risk: ${result.dependencyImpact.dependencyRisk}`,
    `Architecture Drift: ${result.architectureBoundaries.architectureDrift}`,
    `CI Failure Risk: +${result.riskScore.ciFailureRiskPercent}%`,
  ].join('\n');
}

function toPrComment(result) {
  return [
    '⚠️ Summit Architecture Copilot',
    '',
    `This PR modifies ${result.changeSummary.subsystemsImpacted} subsystems and introduces ${result.architectureBoundaries.boundaryViolations.length} cross-subsystem coupling path(s).`,
    '',
    `Risk score: ${result.riskScore.score} (${result.riskScore.riskLevel})`,
    `CI Failure Risk Delta: +${result.riskScore.ciFailureRiskPercent}%`,
  ].join('\n');
}

function loadFiles(args) {
  if (args['files-json']) {
    const input = JSON.parse(fs.readFileSync(args['files-json'], 'utf8'));
    if (Array.isArray(input)) return input;
    if (Array.isArray(input.files)) return input.files;
  }

  if (args['event-json']) {
    const event = JSON.parse(fs.readFileSync(args['event-json'], 'utf8'));
    if (Array.isArray(event.files)) return event.files;
  }

  return [];
}

const args = parseArgs(process.argv);
const files = loadFiles(args);
const result = analyze(files);

const outputDir = args['output-dir'] ?? '.repoos/pr-analysis';
stableWrite(path.join(outputDir, 'pr-change-summary.json'), result.changeSummary);
stableWrite(path.join(outputDir, 'dependency-impact.json'), result.dependencyImpact);
stableWrite(path.join(outputDir, 'architecture-boundaries.json'), result.architectureBoundaries);
stableWrite(path.join(outputDir, 'risk-score.json'), result.riskScore);
fs.writeFileSync(path.join(outputDir, 'summary.txt'), `${toSummaryMarkdown(result)}\n`);
fs.writeFileSync(path.join(outputDir, 'pr-comment.md'), `${toPrComment(result)}\n`);
fs.writeFileSync(path.join(outputDir, 'pr-architecture-report.html'), generateHtmlReport(
  result.changeSummary,
  result.dependencyImpact,
  result.architectureBoundaries,
  result.riskScore,
));

const evidence = {
  analysis: {
    filesModified: result.changeSummary.filesModified,
    subsystemsImpacted: result.changeSummary.subsystemsImpacted,
    dependencyRisk: result.dependencyImpact.dependencyRisk,
    architectureDrift: result.architectureBoundaries.architectureDrift,
    riskScore: result.riskScore.score,
    ciFailureRiskPercent: result.riskScore.ciFailureRiskPercent,
  },
  deterministic: true,
  generatedArtifacts: [
    '.repoos/pr-analysis/pr-change-summary.json',
    '.repoos/pr-analysis/dependency-impact.json',
    '.repoos/pr-analysis/architecture-boundaries.json',
    '.repoos/pr-analysis/risk-score.json',
    '.repoos/pr-analysis/pr-architecture-report.html',
  ],
};
stableWrite('.repoos/evidence/pr-architecture-copilot-report.json', evidence);

console.log(toSummaryMarkdown(result));
