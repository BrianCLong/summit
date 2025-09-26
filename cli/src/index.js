import { Command } from 'commander';
import { runUp } from './commands/up.js';
import { runTest } from './commands/test.js';
import { runSeed } from './commands/seed.js';

const program = new Command();

program
  .name('summit')
  .description('Summit local development CLI')
  .version('0.1.0');

program.enablePositionalOptions(true);

program
  .command('up')
  .description('Start local development infrastructure')
  .option('--compose-file <path>', 'Path to docker compose file', 'docker-compose.yml')
  .option('--services <names>', 'Comma separated list of services to start')
  .option('--no-detach', 'Run docker compose in the foreground')
  .option('--build', 'Force build before starting containers', false)
  .option('--k8s', 'Apply Kubernetes manifests instead of Docker Compose', false)
  .option('--kube-manifest <path>', 'Path to Kubernetes manifest file or directory', 'deploy/k8s')
  .option('--namespace <name>', 'Kubernetes namespace to target', 'summit-dev')
  .option('--context <name>', 'Kubernetes context to use')
  .action(async (options) => {
    await runUp(options);
  });

program
  .command('test')
  .description('Run Summit test suites')
  .option('--scope <name>', 'Scope to run (all, server, client)', 'all')
  .option('--package-manager <pm>', 'Package manager to use (pnpm|npm|yarn)')
  .option('--watch', 'Run tests in watch mode')
  .allowExcessArguments(true)
  .passThroughOptions()
  .action(async (options, command) => {
    const passthrough = command.args ?? [];
    await runTest({ ...options, passthrough });
  });

program
  .command('seed')
  .description('Seed local databases with test data')
  .option('--package-manager <pm>', 'Package manager to use (pnpm|npm|yarn)')
  .option('--dry-run', 'Print the seed command without executing it', false)
  .action(async (options) => {
    await runSeed(options);
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
