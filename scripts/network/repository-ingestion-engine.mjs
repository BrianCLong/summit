#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const outputDir = path.resolve('.global-intelligence');
const outputFile = path.join(outputDir, 'repository-dataset.json');

function run(command, cwd = process.cwd()) {
  return execSync(command, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function tryRun(command, cwd = process.cwd(), fallback = '') {
  try {
    return run(command, cwd);
  } catch {
    return fallback;
  }
}

function listDirs(root) {
  return readdirSync(root)
    .map((name) => path.join(root, name))
    .filter((entry) => statSync(entry).isDirectory())
    .sort((a, b) => a.localeCompare(b));
}

function discoverRepositories() {
  const manifestPath = path.resolve('.global-intelligence/repositories.json');
  if (existsSync(manifestPath)) {
    const parsed = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const manifestRepos = Array.isArray(parsed.repositories) ? parsed.repositories : [];
    return manifestRepos
      .map((item) => path.resolve(item.path || item))
      .filter((repoPath) => existsSync(path.join(repoPath, '.git')))
      .sort((a, b) => a.localeCompare(b));
  }

  const candidates = [process.cwd(), ...listDirs(process.cwd())];
  return candidates
    .filter((repoPath) => existsSync(path.join(repoPath, '.git')))
    .sort((a, b) => a.localeCompare(b));
}

function hashFileIfExists(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}


function parsePackageJson(packageJsonPath) {
  if (!existsSync(packageJsonPath)) {
    return { parsed: null, parse_error: null };
  }

  const raw = readFileSync(packageJsonPath, 'utf8');
  try {
    return { parsed: JSON.parse(raw), parse_error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { parsed: null, parse_error: `Invalid package.json at ${packageJsonPath}: ${message}` };
  }
}
function collectRepositorySignals(repoPath) {
  const name = path.basename(repoPath);
  const branch = tryRun('git rev-parse --abbrev-ref HEAD', repoPath, 'unknown');
  const head = tryRun('git rev-parse HEAD', repoPath, 'unknown');

  const commitCount = Number.parseInt(tryRun('git rev-list --count HEAD', repoPath, '0'), 10) || 0;
  const recentCommitLines = tryRun('git log --pretty=format:%H\t%ct\t%s -n 50', repoPath, '')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [sha, unixTs, ...subject] = line.split('\t');
      return {
        sha,
        timestamp_unix: Number.parseInt(unixTs, 10) || 0,
        subject: subject.join('\t'),
      };
    });

  const refactorEvents = recentCommitLines.filter((entry) => /refactor|cleanup|rename|restructure/i.test(entry.subject));

  const packageJsonPath = path.join(repoPath, 'package.json');
  const { parsed: packageJson, parse_error: packageParseError } = parsePackageJson(packageJsonPath);

  const dependencies = packageJson
    ? {
        runtime: Object.keys(packageJson.dependencies || {}).sort(),
        development: Object.keys(packageJson.devDependencies || {}).sort(),
      }
    : { runtime: [], development: [] };

  const workflowDir = path.join(repoPath, '.github/workflows');
  const workflows = existsSync(workflowDir)
    ? readdirSync(workflowDir).filter((file) => file.endsWith('.yml') || file.endsWith('.yaml')).sort()
    : [];

  const ciSignals = {
    workflow_count: workflows.length,
    workflows,
    flaky_marker_count: Number.parseInt(
      tryRun("rg -n -S 'flaky|retry' .github/workflows | wc -l", repoPath, '0'),
      10,
    ) || 0,
  };

  const topLevelDirs = listDirs(repoPath)
    .map((entry) => path.basename(entry))
    .filter((name) => !name.startsWith('.'))
    .slice(0, 200);

  const architectureMetrics = {
    top_level_modules: topLevelDirs.length,
    has_monorepo_workspace: Boolean(packageJson?.workspaces),
    dependency_depth_proxy: Math.max(1, Math.ceil(Math.log2(dependencies.runtime.length + dependencies.development.length + 1))),
  };

  const evidence = {
    package_json_sha256: hashFileIfExists(packageJsonPath),
    workflow_fingerprint_sha256: createHash('sha256').update(workflows.join('|')).digest('hex'),
    commit_signal_sha256: createHash('sha256').update(recentCommitLines.map((c) => `${c.sha}:${c.subject}`).join('|')).digest('hex'),
  };

  return {
    repository_id: name,
    repository_path: repoPath,
    source_evidence: {
      branch,
      head,
      commit_count: commitCount,
      recent_commits: recentCommitLines,
      ci_signals: ciSignals,
      dependencies,
      refactor_events: refactorEvents,
      architecture_metrics: architectureMetrics,
      evidence,
      package_parse_error: packageParseError,
    },
    repository_state_graph: {
      nodes: [
        { id: `repo:${name}`, kind: 'Repository' },
        { id: `branch:${branch}`, kind: 'Branch' },
        { id: `commit:${head}`, kind: 'Commit' },
      ],
      edges: [
        { from: `repo:${name}`, to: `branch:${branch}`, type: 'HAS_BRANCH' },
        { from: `branch:${branch}`, to: `commit:${head}`, type: 'HEAD_AT' },
      ],
    },
    repository_knowledge_graph: {
      entities: [
        { id: `repo:${name}`, class: 'Repository' },
        ...dependencies.runtime.map((dep) => ({ id: `dependency:${dep}`, class: 'RuntimeDependency' })),
        ...dependencies.development.map((dep) => ({ id: `dependency:${dep}`, class: 'DevDependency' })),
      ],
      relations: [
        ...dependencies.runtime.map((dep) => ({ from: `repo:${name}`, to: `dependency:${dep}`, type: 'USES_RUNTIME' })),
        ...dependencies.development.map((dep) => ({ from: `repo:${name}`, to: `dependency:${dep}`, type: 'USES_DEV' })),
      ],
    },
  };
}

function main() {
  mkdirSync(outputDir, { recursive: true });
  const repositories = discoverRepositories().map(collectRepositorySignals);

  const head = tryRun('git rev-parse HEAD', process.cwd(), 'unknown');
  const dataset = {
    schema_version: '1.0.0',
    generated_from_head: head,
    repositories_analyzed: repositories.length,
    repositories,
  };

  writeFileSync(outputFile, `${JSON.stringify(dataset, null, 2)}\n`);
  console.log(`Wrote ${outputFile} with ${repositories.length} repositories.`);
}

main();
