import { Command } from 'commander';
import path from 'node:path';
import {
  describeProviderConfigs,
  loadProviderConfigs,
  runConformance,
} from '../libs/provider-conformance/src/index.js';
import type { ProviderId } from '../libs/provider-conformance/src/types.js';

const program = new Command();

const parseProviders = (value: string): ProviderId[] => {
  const providers = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean) as ProviderId[];

  return providers;
};

program
  .name('provider-conformance')
  .description('Run provider conformance harness against configured LLM providers.')
  .option(
    '-p, --providers <list>',
    'Comma-separated provider list (env PROVIDERS).',
  )
  .option(
    '-o, --output <dir>',
    'Output directory root.',
    'artifacts/provider-conformance',
  )
  .option('--dry-run', 'Print configuration summary without running contracts.', false)
  .parse(process.argv);

const options = program.opts<{ providers?: string; output: string; dryRun: boolean }>();
const providersInput = options.providers ?? process.env.PROVIDERS ?? '';

if (!providersInput) {
  console.error('No providers specified. Set PROVIDERS or pass --providers.');
  process.exit(1);
}

const providers = parseProviders(providersInput);
const configs = loadProviderConfigs();
const configSummary = describeProviderConfigs(configs);

console.log('Provider configuration (redacted):');
console.log(JSON.stringify(configSummary, null, 2));

if (options.dryRun) {
  console.log('Dry run complete.');
  process.exit(0);
}

const outputRoot = path.resolve(process.cwd(), options.output);

runConformance(providers, configs, outputRoot)
  .then((report) => {
    const configuredProviders = report.providers.filter((provider) => provider.configured);
    if (configuredProviders.length === 0) {
      console.error('No configured providers available to run conformance checks.');
      process.exit(1);
    }

    const failedContracts = report.providers.flatMap((provider) =>
      provider.contracts.filter((contract) => !contract.passed).map((contract) => ({
        provider: provider.id,
        contract: contract.id,
      })),
    );

    if (failedContracts.length > 0) {
      console.error('Contract failures detected:', failedContracts);
      process.exit(2);
    }

    console.log('Conformance run complete.');
  })
  .catch((error) => {
    console.error('Conformance run failed:', error);
    process.exit(1);
  });
