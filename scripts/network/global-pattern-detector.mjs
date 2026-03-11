#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const intelligenceDir = path.resolve('.global-intelligence');
const datasetPath = path.join(intelligenceDir, 'repository-dataset.json');
const patternsPath = path.join(intelligenceDir, 'global-patterns.json');

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function main() {
  const dataset = JSON.parse(readFileSync(datasetPath, 'utf8'));
  const repos = dataset.repositories || [];

  const dependencyDepths = repos.map((repo) => repo.source_evidence.architecture_metrics.dependency_depth_proxy || 0);
  const ciWorkflowCounts = repos.map((repo) => repo.source_evidence.ci_signals.workflow_count || 0);
  const refactorEvents = repos.map((repo) => (repo.source_evidence.refactor_events || []).length);

  const runtimeDependencyFrequency = new Map();
  for (const repo of repos) {
    for (const dep of repo.source_evidence.dependencies.runtime || []) {
      runtimeDependencyFrequency.set(dep, (runtimeDependencyFrequency.get(dep) || 0) + 1);
    }
  }

  const topDependencies = [...runtimeDependencyFrequency.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([dependency, repositories]) => ({ dependency, repositories }));

  const patterns = {
    schema_version: '1.0.0',
    repositories_analyzed: repos.length,
    architecture_patterns: [
      {
        id: 'dependency-topology-depth-median',
        signal: 'Dependency depth proxy across repositories',
        median_depth: median(dependencyDepths),
        evidence: repos.map((repo) => ({ repository_id: repo.repository_id, depth: repo.source_evidence.architecture_metrics.dependency_depth_proxy })),
      },
      {
        id: 'ci-workflow-topology',
        signal: 'Workflow footprint as CI complexity proxy',
        median_workflows: median(ciWorkflowCounts),
        evidence: repos.map((repo) => ({ repository_id: repo.repository_id, workflows: repo.source_evidence.ci_signals.workflow_count })),
      },
    ],
    dependency_growth_models: topDependencies,
    refactor_success_models: [
      {
        id: 'refactor-intensity-proxy',
        signal: 'Recent refactor event density',
        median_refactor_events: median(refactorEvents),
        evidence: repos.map((repo) => ({ repository_id: repo.repository_id, refactor_events: (repo.source_evidence.refactor_events || []).length })),
      },
    ],
    technology_trends: topDependencies.map((entry) => ({
      technology: entry.dependency,
      adoption_repositories: entry.repositories,
      confidence: Number((entry.repositories / Math.max(1, repos.length)).toFixed(4)),
    })),
  };

  mkdirSync(intelligenceDir, { recursive: true });
  writeFileSync(patternsPath, `${JSON.stringify(patterns, null, 2)}\n`);
  console.log(`Wrote ${patternsPath}`);
}

main();
