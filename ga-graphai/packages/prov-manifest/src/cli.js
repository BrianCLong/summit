import process from 'node:process';
import { verifyManifest, toReportJson } from './verifyManifest.js';

const printHelp = () => {
  console.log(`Usage: ig-manifest verify <bundlePath> [--json]\n\nCommands:\n  verify <bundlePath>    Validate manifest integrity\n\nOptions:\n  --json                 Output machine-readable JSON report\n`);
};

export const runCli = async () => {
  const [, , command, bundlePath, ...rest] = process.argv;
  const asJson = rest.includes('--json');

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command !== 'verify' || !bundlePath) {
    console.error('Invalid arguments.');
    printHelp();
    process.exitCode = 1;
    return;
  }

  try {
    const report = await verifyManifest(bundlePath);
    if (asJson) {
      console.log(toReportJson(report));
    } else {
      console.log(`Manifest version: ${report.manifestVersion}`);
      console.log(`Checked files: ${report.checkedFiles}`);
      console.log(report.valid ? 'Status: OK' : 'Status: FAILED');
      if (report.issues.length > 0) {
        console.log('\nIssues:');
        for (const issue of report.issues) {
          console.log(`- [${issue.code}] ${issue.message}`);
        }
      }
    }
    process.exitCode = report.valid ? 0 : 1;
  } catch (error) {
    console.error('Verification failed:', error);
    process.exitCode = 1;
  }
};

const invokedDirectly = process.argv[1]?.includes('ig-manifest') ?? false;

if (invokedDirectly) {
  runCli();
}
