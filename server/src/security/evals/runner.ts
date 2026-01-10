import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import {
  EvaluationResult,
  HarnessConfig,
  Scenario,
  ScenarioCategory,
  scenarioCategories,
} from './types';
import { evaluateScenario, loadScenario } from './harness';

export const loadScenarioFile = (filePath: string): Scenario => {
  const contents = fs.readFileSync(filePath, 'utf-8');
  const parsed = yaml.load(contents);
  return loadScenario(parsed);
};

export const loadScenarios = (directory: string, categories?: ScenarioCategory[]): Scenario[] => {
  const files = fs
    .readdirSync(directory)
    .filter((file: string) => file.endsWith('.yaml') || file.endsWith('.yml'))
    .sort();
  const scenarios: Scenario[] = files.map((file: string) =>
    loadScenarioFile(path.join(directory, file)),
  );
  return categories && categories.length > 0
    ? scenarios.filter((scenario) => categories.includes(scenario.category))
    : scenarios;
};

export const evaluateScenarios = (
  scenarios: Scenario[],
  config: HarnessConfig = {},
): { results: EvaluationResult[]; coverage: Record<ScenarioCategory, number> } => {
  const results = scenarios.map((scenario) => evaluateScenario(scenario, config));
  const coverage: Record<ScenarioCategory, number> = Object.fromEntries(
    scenarioCategories.map((category) => [category, 0]),
  ) as Record<ScenarioCategory, number>;
  results.forEach((result) => {
    coverage[result.scenario.category] += 1;
  });
  return { results, coverage };
};

export const enforceCoverage = (
  coverage: Record<ScenarioCategory, number>,
  thresholds: Partial<Record<ScenarioCategory, number>> = {},
  activeCategories: ScenarioCategory[] = [...scenarioCategories],
): string[] => {
  const failures: string[] = [];
  activeCategories.forEach((category) => {
    const minimum = thresholds[category] ?? 3;
    if ((coverage[category] ?? 0) < minimum) {
      failures.push(
        `Category ${category} has ${coverage[category] ?? 0} scenarios (minimum ${minimum})`,
      );
    }
  });
  return failures;
};

export const renderResults = (results: EvaluationResult[]): string => {
  const lines: string[] = [];
  results.forEach((result) => {
    lines.push(
      `${result.scenario.id}: ${result.passed ? 'PASS' : 'FAIL'} (${result.decision})`,
    );
    if (!result.passed) {
      result.findings.forEach((finding) => {
        lines.push(
          `  - [${finding.severity}] ${finding.category}: ${finding.evidence}`,
        );
      });
    }
  });
  return lines.join('\n');
};

export const strictModeSubset = (scenarios: Scenario[]): Scenario[] =>
  scenarios.filter((scenario) => scenario.policyMode === 'strict');
