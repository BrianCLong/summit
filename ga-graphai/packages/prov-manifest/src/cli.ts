#!/usr/bin/env node
import { verifyManifest } from './index.js';
import { MANIFEST_VERSION } from './schema.js';

function printHelp() {
  console.log(`ig-manifest v${MANIFEST_VERSION}`);
  console.log('Usage: ig-manifest verify <bundlePath> [--json]');
  console.log('Commands:');
  console.log('  verify   Validate a manifest bundle');
  console.log('Options:');
  console.log('  --json   Output a JSON report');
  console.log('  --help   Show this help message');
}

async function run() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  const [command, bundlePath, ...rest] = args;
  if (command !== 'verify' || !bundlePath) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  const jsonOutput = rest.includes('--json');

  try {
    const report = await verifyManifest(bundlePath);
    if (jsonOutput) {
      console.log(JSON.stringify(report, null, 2));
    } else if (report.valid) {
      console.log(`✔ Manifest valid (version ${report.manifestVersion ?? 'unknown'})`);
      console.log(`Files checked: ${report.filesChecked}, transforms: ${report.transformsChecked}`);
    } else {
      console.error('Manifest verification failed:');
      report.issues.forEach((issue) => {
        console.error(`- [${issue.code}] ${issue.message}${issue.path ? ` (${issue.path})` : ''}`);
      });
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Unexpected error while verifying manifest', error);
    process.exitCode = 1;
  }
}

run();
