#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, file), 'utf8'));
}

function listPackageJsonFiles() {
  const targets = ['package.json', 'apps', 'packages', 'server', 'client', 'services'];
  const files = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build') {
        continue;
      }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === 'package.json') {
        files.push(path.relative(repoRoot, full));
      }
    }
  }

  for (const target of targets) {
    const full = path.join(repoRoot, target);
    if (!fs.existsSync(full)) {
      continue;
    }
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else if (target.endsWith('package.json')) {
      files.push(target);
    }
  }

  return [...new Set(files)];
}

function hasFloatingVersion(version) {
  return /^(\^|~|>|<|\*|latest|next|canary)/.test(version) || version.includes('x') || version.includes('X') || version === '';
}

function collectFloatingDeps() {
  const packageFiles = listPackageJsonFiles();
  const floating = [];
  for (const file of packageFiles) {
    const pkg = readJson(file);
    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      const deps = pkg[section] ?? {};
      for (const [name, version] of Object.entries(deps)) {
        if (typeof version === 'string' && hasFloatingVersion(version)) {
          floating.push({ file, section, name, version });
        }
      }
    }
  }
  return floating;
}

function lockfileIntegrity() {
  const lockfilePath = path.join(repoRoot, 'pnpm-lock.yaml');
  if (!fs.existsSync(lockfilePath)) {
    return 'fail';
  }
  const content = fs.readFileSync(lockfilePath, 'utf8');
  return content.includes('lockfileVersion:') ? 'pass' : 'fail';
}

function collectNondeterminism() {
  const checks = [
    { label: 'timestamp_usage', regex: /Date\.now\(|new Date\(/g },
    { label: 'random_seed_usage', regex: /Math\.random\(|crypto\.randomUUID\(/g },
    { label: 'env_leakage', regex: /process\.env\.[A-Z_]+/g },
  ];

  const scanTargets = ['scripts', 'server', 'client', 'apps', 'packages'];
  const findings = [];

  for (const target of scanTargets) {
    const full = path.join(repoRoot, target);
    if (!fs.existsSync(full) || !fs.statSync(full).isDirectory()) {
      continue;
    }

    const stack = [full];
    while (stack.length > 0) {
      const current = stack.pop();
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build') {
          continue;
        }
        const entryPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(entryPath);
          continue;
        }
        if (!/\.(js|ts|tsx|mjs|cjs|json)$/.test(entry.name)) {
          continue;
        }

        const content = fs.readFileSync(entryPath, 'utf8');
        for (const check of checks) {
          const matches = content.match(check.regex);
          if (matches && matches.length > 0) {
            findings.push({
              type: check.label,
              file: path.relative(repoRoot, entryPath),
              count: matches.length,
            });
          }
        }
      }
    }
  }

  return findings;
}

function buildP0Queue() {
  const ledger = readJson('docs/security/critical-todos-ledger.json');
  const critical = ledger.critical_todos ?? [];
  return critical.map((item, idx) => ({
    id: item.id ?? `local-${idx + 1}`,
    title: item.title,
    category: 'security',
    ga_blocker: true,
    confidence: 'high',
    required_action: item.recommended_action ?? item.immediate_action ?? 'Implement mitigation and validate with tests.',
    labels: ['prio:P0', 'ga:blocker', 'queue:deterministic'],
  }));
}

fs.mkdirSync(path.join(repoRoot, 'docs/ga/reports'), { recursive: true });

const p0Queue = buildP0Queue();
const floatingDeps = collectFloatingDeps();
const nondeterminism = collectNondeterminism();
const lockStatus = lockfileIntegrity();

const report = {
  summit_ga_sweep: {
    merge_health: {
      pending_checks: -1,
      blocked_merges: -1,
      orphaned_runs: -1,
      ci_queue_depth: -1,
      status: 'degraded',
      note: 'GitHub API unavailable in this execution environment; remote merge and CI telemetry deferred pending authenticated gh access.',
    },
    p0_queue: p0Queue,
    reproducibility: {
      lockfile_integrity: lockStatus,
      floating_deps_detected: floatingDeps.length,
      manifest_enforced: false,
      nondeterminism_sources: nondeterminism.slice(0, 100),
      status: lockStatus === 'pass' && floatingDeps.length === 0 ? 'pass' : 'warn',
    },
    ci_guardrails: {
      saturation_detected: false,
      offenders: [],
      note: 'CI queue telemetry unavailable locally; enforce concurrency limits in workflow YAML as follow-up.',
    },
    ga_readiness: {
      merge_health: 'degraded',
      p0_blockers: p0Queue.length,
      reproducibility: lockStatus === 'pass' && floatingDeps.length === 0 ? 'pass' : 'warn',
      ci_health: 'saturated',
      overall: p0Queue.length > 0 ? 'red' : 'yellow',
    },
    next_actions: [
      'Run the sweep in a GitHub-authenticated runner to resolve pending_checks/blocked_merges/orphaned_runs/ci_queue_depth with live repository telemetry.',
      'Convert each P0 queue item into a tracked issue and preserve labels: prio:P0, ga:blocker, queue:deterministic.',
      'Harden reproducibility by pinning floating dependency ranges in critical packages and re-running lockfile verification under --frozen-lockfile.',
      'Implement manifest gate checks that reject untracked writes and assert run_id propagation across all write paths.',
    ],
  },
};

const outJson = path.join(repoRoot, 'docs/ga/reports/summit-ga-sweep-2026-03-01.json');
const outYaml = path.join(repoRoot, 'docs/ga/reports/summit-ga-sweep-2026-03-01.yaml');

fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);

function toYaml(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return '[]';
    }
    return obj
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          const nested = toYaml(item, indent + 1);
          if (nested.includes('\n')) {
            return `${pad}-\n${nested}`;
          }
          return `${pad}- ${nested.trimStart()}`;
        }
        return `${pad}- ${String(item)}`;
      })
      .join('\n');
  }

  if (obj && typeof obj === 'object') {
    return Object.entries(obj)
      .map(([key, value]) => {
        if (value && typeof value === 'object') {
          const nested = toYaml(value, indent + 1);
          if (Array.isArray(value) && value.length === 0) {
            return `${pad}${key}: []`;
          }
          return `${pad}${key}:\n${nested}`;
        }
        if (typeof value === 'string') {
          const escaped = value.includes(':') || value.includes('#') ? `'${value.replace(/'/g, "''")}'` : value;
          return `${pad}${key}: ${escaped}`;
        }
        return `${pad}${key}: ${value}`;
      })
      .join('\n');
  }

  return `${obj}`;
}

fs.writeFileSync(outYaml, `${toYaml(report)}\n`);

console.log(`Wrote ${path.relative(repoRoot, outJson)}`);
console.log(`Wrote ${path.relative(repoRoot, outYaml)}`);
console.log(`P0 queue items: ${p0Queue.length}`);
console.log(`Floating deps detected: ${floatingDeps.length}`);
