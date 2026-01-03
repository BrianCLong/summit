#!/usr/bin/env tsx
import { Command } from "commander";
import path from "path";
import {
  evaluateScenarios,
  enforceCoverage,
  loadScenarioFile,
  loadScenarios,
  renderResults,
  strictModeSubset,
  ScenarioCategory,
} from "../src/security/evals";

const program = new Command();
program
  .option("--category <category...>", "Scenario category filter")
  .option("--scenario <file>", "Path to a single scenario yaml file")
  .option("--json", "Emit machine-readable JSON", false)
  .option("--seed <seed>", "Deterministic seed", "ci-seed")
  .option("--strict-only", "Run only strict mode scenarios", false);

const run = (): void => {
  program.parse(process.argv);
  const options = program.opts();
  const scenarioDir = path.resolve(process.cwd(), "server/security/scenarios");

  let scenarios;
  if (options.scenario) {
    const scenarioPath = path.resolve(process.cwd(), options.scenario as string);
    scenarios = [loadScenarioFile(scenarioPath)];
  } else {
    scenarios = loadScenarios(scenarioDir, options.category);
  }

  if (options.strictOnly) {
    scenarios = strictModeSubset(scenarios);
  }

  if (!scenarios || scenarios.length === 0) {
    console.error("No scenarios loaded. Ensure the scenario path and filters are correct.");
    process.exit(2);
  }

  const { results, coverage } = evaluateScenarios(scenarios, {
    seed: options.seed,
    policyModeOverride: options.strictOnly ? "strict" : undefined,
  });

  const activeCategories = Array.from(
    new Set(scenarios.map((scenario) => scenario.category))
  ) as ScenarioCategory[];
  const coverageThresholds = options.strictOnly
    ? { "prompt-injection": 1, "tool-misuse": 1, attribution: 1, redaction: 1 }
    : {};
  const coverageFailures = enforceCoverage(coverage, coverageThresholds, activeCategories);
  const failedScenarios = results.filter((result) => !result.passed);
  const exitCode = coverageFailures.length > 0 || failedScenarios.length > 0 ? 1 : 0;

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          results,
          coverage,
          coverageFailures,
          failed: failedScenarios.map((result) => result.scenario.id),
        },
        null,
        2
      )
    );
  } else {
    console.log(renderResults(results));
    if (coverageFailures.length > 0) {
      console.error("Coverage failures:\n" + coverageFailures.join("\n"));
    }
  }

  process.exit(exitCode);
};

try {
  run();
} catch (error) {
  console.error("Harness error", error);
  process.exit(2);
}
