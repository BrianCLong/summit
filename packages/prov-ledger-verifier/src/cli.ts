#!/usr/bin/env node
import process from "node:process";
import { verifyBundle } from "./bundleVerifier.js";
import { formatReport } from "./reporter.js";

function printHelp(): void {
  console.log(`Provenance Export Manifest Verifier

Usage:
  prov-ledger-verify <bundle-path> [--json]
  prov-ledger-verify --bundle <bundle-path> [--json]

Options:
  -b, --bundle   Path to export bundle directory or .zip
  --json         Emit machine-readable JSON report
  -h, --help     Show this message
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let bundlePath: string | undefined;
  let json = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? "";
    if (arg === "--bundle" || arg === "-b") {
      const next = args[i + 1];
      if (next) {
        bundlePath = next;
        i += 1;
      }
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      return;
    } else if (!arg.startsWith("-") && !bundlePath) {
      bundlePath = arg;
    }
  }

  if (!bundlePath) {
    printHelp();
    process.exitCode = 2;
    return;
  }

  try {
    const report = await verifyBundle(bundlePath);
    if (json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatReport(report));
    }
    process.exitCode = report.ok ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Verification failed: ${message}`);
    process.exitCode = 1;
  }
}

main();
