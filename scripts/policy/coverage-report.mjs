#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import {
  ensureOpaBinary,
  evaluatePolicyScenario,
  loadScenarios,
  resolveArgs,
  resolveFixturePath,
} from './lib/opa-sim-utils.mjs';

function main() {
  const args = resolveArgs(process.argv.slice(2));
  const fixturePath = resolveFixturePath(args.fixtures);
  const threshold = Number(args.threshold || process.env.POLICY_COVERAGE_THRESHOLD || 90);
  const outPath = path.resolve(
    process.cwd(),
    args.out || 'reports/policy-coverage-report.json',
  );

  const scenarios = loadScenarios(fixturePath);
  const privileged = scenarios.filter((s) => s.privilegedFlow);
  if (privileged.length === 0) {
    throw new Error('No privileged flow scenarios found for coverage report.');
  }

  const opaBin = ensureOpaBinary({
    autoInstall: args['auto-install-opa'] !== 'false',
  });

  let privilegedCovered = 0;
  const details = [];
  for (const scenario of privileged) {
    const result = evaluatePolicyScenario(opaBin, scenario);
    const covered = result.require_approval === true;
    if (covered) {
      privilegedCovered += 1;
    }
    details.push({
      id: scenario.id,
      covered,
      required_approvals: result.required_approvals || 0,
      policy_version: result.policy_version || 'unknown',
    });
  }

  const coveragePct = Number(
    ((privilegedCovered / privileged.length) * 100).toFixed(2),
  );
  const report = {
    metric: 'privileged_flows_policy_covered',
    total_privileged_flows: privileged.length,
    covered_flows: privilegedCovered,
    coverage_percent: coveragePct,
    threshold_percent: threshold,
    pass: coveragePct >= threshold,
    details,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) {
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
