#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const intelligenceDir = path.resolve('.global-intelligence');
const patternsPath = path.join(intelligenceDir, 'global-patterns.json');
const learningPath = path.join(intelligenceDir, 'network-learning-models.json');
const reportPath = path.join(intelligenceDir, 'engineering-intelligence-network.json');

function main() {
  const patterns = JSON.parse(readFileSync(patternsPath, 'utf8'));
  const models = JSON.parse(readFileSync(learningPath, 'utf8'));

  const report = {
    repositories_analyzed: patterns.repositories_analyzed,
    architecture_patterns: patterns.architecture_patterns,
    dependency_growth_models: patterns.dependency_growth_models,
    refactor_success_models: patterns.refactor_success_models,
    technology_trends: patterns.technology_trends,
    network_learning: {
      stability_predictor: models.stability_predictor,
      evolution_simulator: models.evolution_simulator,
      architecture_optimizer: models.architecture_optimizer,
      innovation_detection_models: models.innovation_detection_models,
    },
  };

  mkdirSync(intelligenceDir, { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${reportPath}`);
}

main();
