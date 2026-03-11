#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const intelligenceDir = path.resolve('.global-intelligence');
const patternsPath = path.join(intelligenceDir, 'global-patterns.json');
const learningPath = path.join(intelligenceDir, 'network-learning-models.json');
const evidenceLedgerPath = path.join(intelligenceDir, 'evidence-ledger-entry.json');

function normalize(value, maxValue) {
  return maxValue > 0 ? Number((value / maxValue).toFixed(6)) : 0;
}

function main() {
  const patterns = JSON.parse(readFileSync(patternsPath, 'utf8'));

  const repoCount = Math.max(1, patterns.repositories_analyzed || 1);
  const topTrendScore = patterns.technology_trends?.[0]?.confidence || 0;
  const depthMedian = patterns.architecture_patterns?.[0]?.median_depth || 0;
  const workflowMedian = patterns.architecture_patterns?.[1]?.median_workflows || 0;
  const refactorMedian = patterns.refactor_success_models?.[0]?.median_refactor_events || 0;

  const models = {
    schema_version: '1.0.0',
    repositories_analyzed: repoCount,
    stability_predictor: {
      model_type: 'deterministic-linear-proxy',
      coefficients: {
        dependency_depth_weight: normalize(depthMedian, 20),
        ci_workflow_weight: normalize(workflowMedian, 20),
        refactor_event_weight: normalize(refactorMedian, 20),
      },
    },
    evolution_simulator: {
      model_type: 'ecosystem-adoption-simulator',
      adoption_pressure: topTrendScore,
      growth_factor: Number((1 + topTrendScore).toFixed(6)),
    },
    architecture_optimizer: {
      model_type: 'pattern-ranked-recommender',
      top_dependency_clusters: patterns.dependency_growth_models?.slice(0, 5) || [],
    },
    innovation_detection_models: {
      model_type: 'trend-momentum-detector',
      technology_trends: patterns.technology_trends?.slice(0, 10) || [],
    },
  };

  const modelsJson = `${JSON.stringify(models, null, 2)}\n`;
  const evidenceLedger = {
    ledger_version: '1.0.0',
    artifact: 'network-learning-models.json',
    sha256: createHash('sha256').update(modelsJson).digest('hex'),
    source_artifacts: ['repository-dataset.json', 'global-patterns.json'],
    evidence_chain: [
      {
        type: 'repository-knowledge-graph',
        path: '.global-intelligence/repository-dataset.json',
      },
      {
        type: 'global-patterns',
        path: '.global-intelligence/global-patterns.json',
      },
    ],
  };

  mkdirSync(intelligenceDir, { recursive: true });
  writeFileSync(learningPath, modelsJson);
  writeFileSync(evidenceLedgerPath, `${JSON.stringify(evidenceLedger, null, 2)}\n`);
  console.log(`Wrote ${learningPath}`);
  console.log(`Wrote ${evidenceLedgerPath}`);
}

main();
