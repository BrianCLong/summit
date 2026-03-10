#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const EXCLUDED_DIRS = new Set([
  '.git',
  '.repoos',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '.next',
  '.cache'
]);

const CODE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.rs']);

function normalizePosix(filePath) {
  return filePath.split(path.sep).join('/');
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath, data) {
  const serialized = `${JSON.stringify(data, null, 2)}\n`;
  await fs.writeFile(filePath, serialized, 'utf-8');
}

async function listFiles(rootDir) {
  const files = [];
  const dirs = new Set();

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.github') {
        continue;
      }
      if (EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);
      const relPath = normalizePosix(path.relative(rootDir, fullPath));

      if (entry.isDirectory()) {
        dirs.add(relPath);
        await walk(fullPath);
      } else if (entry.isFile()) {
        files.push(relPath);
      }
    }
  }

  await walk(rootDir);
  files.sort();
  return { files, directories: Array.from(dirs).sort() };
}

function parseImports(content) {
  const imports = new Set();
  const importRegex = /(?:import\s+(?:.+?\s+from\s+)?|export\s+.+?\s+from\s+|require\()\s*['\"]([^'\"]+)['\"]/g;
  let match = importRegex.exec(content);
  while (match) {
    imports.add(match[1]);
    match = importRegex.exec(content);
  }
  return Array.from(imports).sort();
}

function topLevelSegment(relPath) {
  const [segment] = relPath.split('/');
  return segment || 'root';
}

function resolveRelativeImport(filePath, specifier) {
  const fileDir = path.posix.dirname(filePath);
  const candidates = [
    path.posix.normalize(path.posix.join(fileDir, specifier)),
    path.posix.normalize(path.posix.join(fileDir, `${specifier}.ts`)),
    path.posix.normalize(path.posix.join(fileDir, `${specifier}.tsx`)),
    path.posix.normalize(path.posix.join(fileDir, `${specifier}.js`)),
    path.posix.normalize(path.posix.join(fileDir, `${specifier}.mjs`)),
    path.posix.normalize(path.posix.join(fileDir, specifier, 'index.ts')),
    path.posix.normalize(path.posix.join(fileDir, specifier, 'index.tsx')),
    path.posix.normalize(path.posix.join(fileDir, specifier, 'index.js')),
    path.posix.normalize(path.posix.join(fileDir, specifier, 'index.mjs'))
  ];
  return candidates;
}

async function runGit(repoPath, args) {
  try {
    const { stdout } = await execFileAsync('git', ['-C', repoPath, ...args], {
      maxBuffer: 1024 * 1024 * 30
    });
    return stdout.trim();
  } catch (error) {
    return '';
  }
}

async function buildRepositoryGraph(repoPath, files, directories) {
  const modules = new Map();
  const dependencies = [];
  const fileSet = new Set(files);
  const importsByFile = new Map();

  for (const relPath of files) {
    const segment = topLevelSegment(relPath);
    const existing = modules.get(segment) || { name: segment, files: 0, loc: 0 };

    const ext = path.extname(relPath);
    if (CODE_EXTENSIONS.has(ext)) {
      const content = await fs.readFile(path.join(repoPath, relPath), 'utf-8').catch(() => '');
      const lines = content === '' ? 0 : content.split('\n').length;
      existing.files += 1;
      existing.loc += lines;

      const imports = parseImports(content);
      importsByFile.set(relPath, imports);

      for (const specifier of imports) {
        if (specifier.startsWith('.')) {
          for (const candidate of resolveRelativeImport(relPath, specifier)) {
            if (fileSet.has(candidate)) {
              const targetModule = topLevelSegment(candidate);
              if (targetModule !== segment) {
                dependencies.push({ from: segment, to: targetModule, type: 'internal-import' });
              }
              break;
            }
          }
        } else if (!specifier.startsWith('node:')) {
          dependencies.push({ from: segment, to: specifier.split('/')[0], type: 'package-import' });
        }
      }
    }

    modules.set(segment, existing);
  }

  const packageFiles = files.filter((file) => file.endsWith('package.json'));
  for (const pkgFile of packageFiles) {
    const segment = topLevelSegment(pkgFile);
    const raw = await fs.readFile(path.join(repoPath, pkgFile), 'utf-8').catch(() => '');
    if (raw === '') continue;

    let pkg;
    try {
      pkg = JSON.parse(raw);
    } catch (error) {
      continue;
    }
    const declared = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies
    };
    for (const depName of Object.keys(declared).sort()) {
      dependencies.push({ from: segment, to: depName, type: 'package-json' });
    }
  }

  const contributorsRaw = await runGit(repoPath, ['shortlog', '-sne', '--all']);
  const contributors = contributorsRaw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(.+)$/);
      if (!match) {
        return null;
      }
      return { commits: Number(match[1]), identity: match[2] };
    })
    .filter(Boolean)
    .sort((a, b) => b.commits - a.commits || a.identity.localeCompare(b.identity));

  const mergeLogRaw = await runGit(repoPath, ['log', '--merges', '--pretty=%H|%s']);
  const pullRequests = mergeLogRaw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [commit, title] = line.split('|');
      const prMatch = title.match(/#(\d+)/);
      return {
        merge_commit: commit,
        title,
        pr_number: prMatch ? Number(prMatch[1]) : null
      };
    });

  const uniqueDependencies = Array.from(
    new Map(dependencies.map((dep) => [`${dep.from}|${dep.to}|${dep.type}`, dep])).values()
  ).sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.type.localeCompare(b.type));

  return {
    modules: Array.from(modules.values()).sort((a, b) => a.name.localeCompare(b.name)),
    directories,
    dependencies: uniqueDependencies,
    pull_requests: pullRequests,
    contributors,
    imports_by_file: Object.fromEntries(Array.from(importsByFile.entries()).sort((a, b) => a[0].localeCompare(b[0])))
  };
}

function buildAdjacency(dependencies, typeFilter) {
  const adjacency = new Map();
  for (const dep of dependencies) {
    if (typeFilter && dep.type !== typeFilter) continue;
    if (!adjacency.has(dep.from)) adjacency.set(dep.from, new Set());
    adjacency.get(dep.from).add(dep.to);
  }
  return adjacency;
}

function detectCycles(nodes, adjacency) {
  const temp = new Set();
  const perm = new Set();
  const stack = [];
  const cycles = [];

  function visit(node) {
    if (perm.has(node)) return;
    if (temp.has(node)) {
      const start = stack.indexOf(node);
      if (start >= 0) {
        cycles.push(stack.slice(start).concat(node));
      }
      return;
    }

    temp.add(node);
    stack.push(node);
    const neighbors = adjacency.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (nodes.has(neighbor)) {
        visit(neighbor);
      }
    }
    stack.pop();
    temp.delete(node);
    perm.add(node);
  }

  for (const node of nodes) {
    visit(node);
  }

  return cycles
    .map((cycle) => cycle.join(' -> '))
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .sort();
}

async function collectChurn(repoPath) {
  const raw = await runGit(repoPath, ['log', '--name-only', '--pretty=format:@@']);
  const counts = new Map();
  for (const line of raw.split('\n')) {
    const file = line.trim();
    if (!file || file === '@@') continue;
    const current = counts.get(file) || 0;
    counts.set(file, current + 1);
  }
  return counts;
}

async function collectMergeConflictSignals(repoPath) {
  const raw = await runGit(repoPath, ['log', '--merges', '--name-only', '--pretty=format:@@']);
  const counts = new Map();
  for (const line of raw.split('\n')) {
    const file = line.trim();
    if (!file || file === '@@') continue;
    const current = counts.get(file) || 0;
    counts.set(file, current + 1);
  }
  return counts;
}

async function collectBugFixSignals(repoPath) {
  const raw = await runGit(repoPath, ['log', '--pretty=format:%H|%s', '--name-only']);
  const counts = new Map();
  let isBugFix = false;
  for (const line of raw.split('\n')) {
    if (line.includes('|')) {
      const [, subject = ''] = line.split('|');
      isBugFix = /\b(fix|bug|defect|hotfix|regression)\b/i.test(subject);
      continue;
    }
    const file = line.trim();
    if (!file || !isBugFix) continue;
    const current = counts.get(file) || 0;
    counts.set(file, current + 1);
  }
  return counts;
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[index];
}

function analyzeDependencyRisk(repoGraph, churnByFile) {
  const moduleNames = new Set(repoGraph.modules.map((module) => module.name));
  const internalDeps = repoGraph.dependencies.filter((dep) => dep.type === 'internal-import');

  const adjacency = buildAdjacency(internalDeps);
  const cycles = detectCycles(moduleNames, adjacency);

  const fanIn = new Map();
  for (const dep of internalDeps) {
    fanIn.set(dep.to, (fanIn.get(dep.to) || 0) + 1);
  }

  const fanInThreshold = percentile(Array.from(fanIn.values()), 0.9);
  const highFanInModules = Array.from(fanIn.entries())
    .filter(([, count]) => count >= fanInThreshold && count > 0)
    .map(([module, count]) => ({ module, fan_in: count }))
    .sort((a, b) => b.fan_in - a.fan_in || a.module.localeCompare(b.module));

  const moduleChurn = new Map();
  for (const [file, count] of churnByFile.entries()) {
    const module = topLevelSegment(file);
    moduleChurn.set(module, (moduleChurn.get(module) || 0) + count);
  }

  const unstableClusters = highFanInModules
    .map((item) => {
      const outgoing = adjacency.get(item.module) || new Set();
      const linkedModules = Array.from(outgoing).filter((module) => moduleNames.has(module)).sort();
      const churn = moduleChurn.get(item.module) || 0;
      const instability = item.fan_in * 0.6 + churn * 0.4;
      return {
        module: item.module,
        linked_modules: linkedModules,
        churn,
        instability_score: Number(instability.toFixed(2))
      };
    })
    .sort((a, b) => b.instability_score - a.instability_score || a.module.localeCompare(b.module));

  return {
    summary: {
      circular_dependencies: cycles.length,
      high_fan_in_modules: highFanInModules.length,
      unstable_clusters: unstableClusters.length
    },
    circular_dependencies: cycles,
    high_fan_in_modules: highFanInModules,
    unstable_dependency_clusters: unstableClusters
  };
}

function detectArchitectureDrift(repoGraph, churnByFile) {
  const internalDeps = repoGraph.dependencies.filter((dep) => dep.type === 'internal-import');
  const moduleNames = new Set(repoGraph.modules.map((module) => module.name));

  const boundaryViolations = internalDeps
    .filter((dep) => moduleNames.has(dep.from) && moduleNames.has(dep.to))
    .map((dep) => ({ from: dep.from, to: dep.to }))
    .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));

  const churnByModule = new Map();
  for (const [file, count] of churnByFile.entries()) {
    const module = topLevelSegment(file);
    churnByModule.set(module, (churnByModule.get(module) || 0) + count);
  }

  const couplingByModule = new Map();
  for (const dep of internalDeps) {
    couplingByModule.set(dep.from, (couplingByModule.get(dep.from) || 0) + 1);
  }

  const moduleComplexity = repoGraph.modules
    .map((module) => {
      const coupling = couplingByModule.get(module.name) || 0;
      const churn = churnByModule.get(module.name) || 0;
      const score = module.files * 0.4 + coupling * 0.4 + churn * 0.2;
      return {
        module: module.name,
        files: module.files,
        coupling,
        churn,
        structural_complexity_score: Number(score.toFixed(2))
      };
    })
    .sort((a, b) => b.structural_complexity_score - a.structural_complexity_score || a.module.localeCompare(b.module));

  const complexityGrowth = moduleComplexity.slice(0, 20);
  const averageCoupling = internalDeps.length / Math.max(1, repoGraph.modules.length);
  const driftLevel = averageCoupling > 1.5 ? 'HIGH' : averageCoupling > 0.8 ? 'MODERATE' : 'LOW';

  return {
    summary: {
      drift_level: driftLevel,
      subsystem_boundary_violations: boundaryViolations.length,
      avg_module_coupling: Number(averageCoupling.toFixed(2))
    },
    subsystem_boundary_violations: boundaryViolations,
    coupling_increase_signals: moduleComplexity.slice(0, 10),
    structural_complexity_growth: complexityGrowth
  };
}

function detectHotspots(files, churnByFile, mergeSignals, bugFixSignals) {
  const rows = [];
  for (const file of files) {
    const changeFrequency = churnByFile.get(file) || 0;
    const mergeConflicts = mergeSignals.get(file) || 0;
    const repeatedBugFixes = bugFixSignals.get(file) || 0;

    if (changeFrequency === 0 && mergeConflicts === 0 && repeatedBugFixes === 0) {
      continue;
    }

    const hotspotScore = changeFrequency * 0.6 + mergeConflicts * 0.25 + repeatedBugFixes * 0.15;

    rows.push({
      path: file,
      change_frequency: changeFrequency,
      merge_conflicts: mergeConflicts,
      repeated_bug_fixes: repeatedBugFixes,
      hotspot_score: Number(hotspotScore.toFixed(2))
    });
  }

  rows.sort((a, b) => b.hotspot_score - a.hotspot_score || a.path.localeCompare(b.path));

  return {
    summary: {
      hotspots_detected: rows.length,
      top_hotspot: rows[0]?.path || null
    },
    hotspots: rows.slice(0, 100)
  };
}

function predictRisk(dependencyRisk, architectureDrift, hotspots) {
  const circularCount = dependencyRisk.summary.circular_dependencies;
  const highFanIn = dependencyRisk.summary.high_fan_in_modules;
  const driftViolations = architectureDrift.summary.subsystem_boundary_violations;
  const hotspotScore = hotspots.hotspots.slice(0, 20).reduce((sum, hotspot) => sum + hotspot.hotspot_score, 0);

  const ciFailureLikelihood = Math.min(0.99, Number((0.18 + circularCount * 0.03 + highFanIn * 0.015 + hotspotScore / 1500).toFixed(3)));
  const architecturalInstability = Math.min(0.99, Number((0.2 + driftViolations * 0.01 + highFanIn * 0.02).toFixed(3)));
  const maintenanceRisk = Math.min(0.99, Number((0.22 + hotspotScore / 1100 + driftViolations * 0.004).toFixed(3)));

  const ciLevel = ciFailureLikelihood > 0.6 ? 'ELEVATED' : ciFailureLikelihood > 0.35 ? 'MODERATE' : 'LOW';
  const archLevel = architecturalInstability > 0.6 ? 'HIGH' : architecturalInstability > 0.35 ? 'MODERATE' : 'LOW';
  const maintenanceLevel = maintenanceRisk > 0.6 ? 'HIGH' : maintenanceRisk > 0.35 ? 'MODERATE' : 'LOW';

  return {
    summary: {
      ci_failure_likelihood: ciFailureLikelihood,
      ci_failure_risk_level: ciLevel,
      architectural_instability: architecturalInstability,
      architecture_risk_level: archLevel,
      maintenance_risk: maintenanceRisk,
      maintenance_risk_level: maintenanceLevel
    },
    factors: {
      circular_dependencies: circularCount,
      high_fan_in_modules: highFanIn,
      subsystem_boundary_violations: driftViolations,
      top_hotspot_score_sum: Number(hotspotScore.toFixed(2))
    }
  };
}

function renderHtmlReport(repoGraph, dependencyRisk, architectureDrift, hotspots, predictions) {
  const escape = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

  const topHotspots = hotspots.hotspots.slice(0, 15)
    .map((item) => `<tr><td>${escape(item.path)}</td><td>${item.change_frequency}</td><td>${item.merge_conflicts}</td><td>${item.repeated_bug_fixes}</td><td>${item.hotspot_score}</td></tr>`)
    .join('');

  const topFanIn = dependencyRisk.high_fan_in_modules.slice(0, 15)
    .map((item) => `<tr><td>${escape(item.module)}</td><td>${item.fan_in}</td></tr>`)
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Repository Intelligence Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
    h1, h2 { margin-bottom: 8px; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin: 16px 0 24px; }
    .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; background: #f9fafb; }
    .metric { font-size: 28px; font-weight: bold; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 13px; }
    th { background: #f3f4f6; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Repository Intelligence Report</h1>
  <p>Deterministic architecture and risk assessment from repository topology, dependency graph, and evolution signals.</p>

  <div class="grid">
    <div class="card">
      <div>Modules Analyzed</div>
      <div class="metric">${repoGraph.modules.length}</div>
    </div>
    <div class="card">
      <div>High Risk Dependencies</div>
      <div class="metric">${dependencyRisk.summary.circular_dependencies + dependencyRisk.summary.high_fan_in_modules}</div>
    </div>
    <div class="card">
      <div>CI Failure Risk</div>
      <div class="metric">${predictions.summary.ci_failure_risk_level}</div>
      <div>${predictions.summary.ci_failure_likelihood}</div>
    </div>
  </div>

  <h2>Architecture Health Indicators</h2>
  <ul>
    <li>Drift Level: <strong>${architectureDrift.summary.drift_level}</strong></li>
    <li>Boundary Violations: <strong>${architectureDrift.summary.subsystem_boundary_violations}</strong></li>
    <li>Average Module Coupling: <strong>${architectureDrift.summary.avg_module_coupling}</strong></li>
  </ul>

  <h2>Dependency Graph Risk (Top Fan-In)</h2>
  <table>
    <thead><tr><th>Module</th><th>Fan-In</th></tr></thead>
    <tbody>${topFanIn}</tbody>
  </table>

  <h2>Hotspot Heatmap (Top 15)</h2>
  <table>
    <thead><tr><th>File</th><th>Change Frequency</th><th>Merge Conflicts</th><th>Repeated Bug Fixes</th><th>Hotspot Score</th></tr></thead>
    <tbody>${topHotspots}</tbody>
  </table>

  <h2>Dependency Graph Snapshot</h2>
  <p class="mono">Internal dependencies: ${repoGraph.dependencies.filter((dep) => dep.type === 'internal-import').length} | Package dependencies: ${repoGraph.dependencies.filter((dep) => dep.type !== 'internal-import').length}</p>
</body>
</html>
`;
}

async function main() {
  const repoPathArg = process.argv[2] || '.';
  const repoPath = path.resolve(process.cwd(), repoPathArg);
  const intelligenceDir = path.join(repoPath, '.repoos', 'intelligence');
  const evidenceDir = path.join(repoPath, '.repoos', 'evidence');

  await ensureDir(intelligenceDir);
  await ensureDir(evidenceDir);

  const { files, directories } = await listFiles(repoPath);
  const repoGraph = await buildRepositoryGraph(repoPath, files, directories);

  const churnByFile = await collectChurn(repoPath);
  const mergeSignals = await collectMergeConflictSignals(repoPath);
  const bugFixSignals = await collectBugFixSignals(repoPath);

  const dependencyRisk = analyzeDependencyRisk(repoGraph, churnByFile);
  const architectureDrift = detectArchitectureDrift(repoGraph, churnByFile);
  const hotspots = detectHotspots(files, churnByFile, mergeSignals, bugFixSignals);
  const predictions = predictRisk(dependencyRisk, architectureDrift, hotspots);

  await writeJson(path.join(intelligenceDir, 'repo-graph.json'), repoGraph);
  await writeJson(path.join(intelligenceDir, 'dependency-risk.json'), dependencyRisk);
  await writeJson(path.join(intelligenceDir, 'architecture-drift.json'), architectureDrift);
  await writeJson(path.join(intelligenceDir, 'hotspots.json'), hotspots);
  await writeJson(path.join(intelligenceDir, 'risk-predictions.json'), predictions);

  const reportHtml = renderHtmlReport(repoGraph, dependencyRisk, architectureDrift, hotspots, predictions);
  await fs.writeFile(path.join(intelligenceDir, 'report.html'), reportHtml, 'utf-8');

  const evidence = {
    analysis_summary: {
      modules_analyzed: repoGraph.modules.length,
      directories_analyzed: repoGraph.directories.length,
      high_risk_dependencies: dependencyRisk.summary.circular_dependencies + dependencyRisk.summary.high_fan_in_modules,
      architecture_drift: architectureDrift.summary.drift_level,
      ci_failure_risk: predictions.summary.ci_failure_risk_level
    },
    deterministic_constraints: {
      includes_timestamps: false,
      ordering: 'sorted-lexicographically',
      hash_strategy: 'content-derived'
    }
  };
  await writeJson(path.join(evidenceDir, 'repo-intelligence-report.json'), evidence);

  console.log('Repository Intelligence Report');
  console.log('------------------------------');
  console.log(`Modules Analyzed: ${repoGraph.modules.length}`);
  console.log(`High Risk Dependencies: ${dependencyRisk.summary.circular_dependencies + dependencyRisk.summary.high_fan_in_modules}`);
  console.log(`Architecture Drift: ${architectureDrift.summary.drift_level}`);
  console.log(`CI Failure Risk: ${predictions.summary.ci_failure_risk_level}`);
}

main().catch((error) => {
  console.error('Repository intelligence run failed:', error.message);
  process.exitCode = 1;
});
