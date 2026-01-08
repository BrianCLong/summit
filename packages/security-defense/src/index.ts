#!/usr/bin/env node
import { runAllChecks, summarizeResults } from "./runner.js";
import { RunnerOptions } from "./types.js";

const parseArgs = (): RunnerOptions => {
  const args = process.argv.slice(2);
  const options: RunnerOptions = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--root") {
      options.rootDir = args[i + 1];
      i += 1;
    } else if (arg === "--sbom-baseline") {
      options.sbomBaselinePath = args[i + 1];
      i += 1;
    } else if (arg === "--sbom-target") {
      options.sbomTargetPath = args[i + 1];
      i += 1;
    } else if (arg === "--rotation-days") {
      options.rotationThresholdDays = Number.parseInt(args[i + 1], 10);
      i += 1;
    }
  }
  return options;
};

const main = () => {
  const options = parseArgs();
  const results = runAllChecks(options);
  const summary = summarizeResults(results);
  console.log(JSON.stringify({ summary, results }, null, 2));

  if (summary.failures.length > 0) {
    process.exitCode = 1;
  }
};

main();
