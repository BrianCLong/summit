#!/usr/bin/env node
import {
  checkExpectations,
  ensureOpaBinary,
  evaluatePolicyScenario,
  loadScenarios,
  resolveArgs,
  resolveFixturePath,
} from './lib/opa-sim-utils.mjs';

function main() {
  const args = resolveArgs(process.argv.slice(2));
  const fixturePath = resolveFixturePath(args.fixtures);
  const allScenarios = loadScenarios(fixturePath);
  const scenarios = args['all-privileged']
    ? allScenarios.filter((s) => s.privilegedFlow)
    : allScenarios;

  if (scenarios.length === 0) {
    throw new Error('No policy scenarios to simulate.');
  }

  const opaBin = ensureOpaBinary({
    autoInstall: args['auto-install-opa'] !== 'false',
  });

  const failures = [];
  const outputs = [];

  for (const scenario of scenarios) {
    const result = evaluatePolicyScenario(opaBin, scenario);
    const mismatches = checkExpectations(scenario.expect, result);
    outputs.push({
      id: scenario.id,
      privilegedFlow: Boolean(scenario.privilegedFlow),
      require_approval: Boolean(result.require_approval),
      required_approvals: Number(result.required_approvals || 0),
      policy_version: String(result.policy_version || 'unknown'),
      pass: mismatches.length === 0,
      mismatches,
    });
    if (mismatches.length > 0) {
      failures.push({ id: scenario.id, mismatches });
    }
  }

  const summary = {
    scenarios: outputs.length,
    failures: failures.length,
    pass: failures.length === 0,
    privileged_scenarios: outputs.filter((o) => o.privilegedFlow).length,
    privileged_approval_required: outputs.filter(
      (o) => o.privilegedFlow && o.require_approval,
    ).length,
    results: outputs,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (failures.length > 0) {
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error(
    JSON.stringify(
      {
        pass: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
}
