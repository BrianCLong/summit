#!/usr/bin/env node

const { buildValidator, discoverManifests, runSuite } = require('./harness');

if (!process.env.CONNECTOR_CONTRACTS) {
  process.env.CONNECTOR_CONTRACTS = '1';
}

const validator = buildValidator();
const manifests = discoverManifests();
const { summary } = runSuite(manifests, validator);

console.log('Connector contract golden tests');
console.log(
  `  total: ${summary.total}, passed: ${summary.passed}, failed: ${summary.failed}, skipped: ${summary.skipped}`
);

if (summary.failures.length) {
  console.log('\nFailures:');
  summary.failures.forEach((failure) => {
    console.log(`- ${failure.connectorId} (${failure.manifestPath})`);
    failure.errors.forEach((error) => console.log(`  • ${error}`));
    if (failure.stability && !failure.stability.stable) {
      console.log(
        `  • snapshot stability: versionMatches=${failure.stability.versionMatches}, timestampMatches=${failure.stability.timestampMatches}`
      );
    }
  });
}

if (summary.skippedList.length) {
  console.log('\nSkipped (CONNECTOR_CONTRACTS disabled):');
  summary.skippedList.forEach((item) =>
    console.log(`- ${item.connectorId} (${item.manifestPath}) :: ${item.reason}`)
  );
}

if (summary.failed > 0) {
  process.exitCode = 1;
}
