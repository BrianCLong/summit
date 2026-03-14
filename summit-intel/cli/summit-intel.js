#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { analyzeDependencies } from '../src/dependencyAnalyzer.js';
import { computeDrift } from '../src/driftEngine.js';
import { buildRepoGraph } from '../src/repoGraph.js';
import { toConsoleReport, toHtmlReport } from '../src/reportGenerator.js';
import { predictCIRisk } from '../src/riskModel.js';

const repo = process.argv[2] ?? process.cwd();
const outputHtml = process.argv.includes('--html');

const current = buildRepoGraph(repo);
const previous = { ...current, modules: [] };

const dependencies = analyzeDependencies(current);
const drift = computeDrift(previous, current);
const risk = predictCIRisk({
  newDependencies: drift.newDependencies,
  highRiskDeps: dependencies.highRisk.length,
  driftScore: drift.driftScore,
  changedFiles: current.modules.length,
});

const report = { graph: current, dependencies, drift, risk };
console.log(toConsoleReport(report));

if (outputHtml) {
  const html = toHtmlReport(report);
  const outputPath = path.join(repo, 'summit-intel-report.html');
  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`\nWrote HTML report to ${outputPath}`);
}
