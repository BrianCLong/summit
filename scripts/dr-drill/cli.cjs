#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { runDrDrill } = require("./runner.cjs");
const { formatMachineReadable, formatHumanSummary } = require("./report.cjs");

function parseArgs(argv) {
  const args = { allowProd: false, reportPath: "dr-drill-report.json" };
  argv.forEach((arg) => {
    if (arg === "--allow-prod") {
      args.allowProd = true;
    }
    if (arg.startsWith("--env=")) {
      args.env = arg.split("=")[1];
    }
    if (arg.startsWith("--report=")) {
      args.reportPath = arg.split("=")[1];
    }
  });
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = runDrDrill({ env: args.env, allowProd: args.allowProd });

  const reportPath = path.resolve(args.reportPath);
  fs.writeFileSync(reportPath, formatMachineReadable(report));
  console.log(formatHumanSummary(report));
  console.log(`Machine-readable report written to ${reportPath}`);

  if (report.overallStatus !== "passed") {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { parseArgs };
