import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { loadConfig } from './lib/config.js';
import { OutputFormatter } from './lib/output.js';
import { registerDevCommands } from './commands/dev.js';
import { registerTestCommands } from './commands/test.js';
import { registerDbCommands } from './commands/db.js';
import { registerDeployCommands } from './commands/deploy.js';
import { registerPipelineCommands } from './commands/pipelines.js';
import { registerCopilotCommands } from './commands/copilot.js';
import { registerCatalogCommands } from './commands/catalog.js';
import { registerVerifyCommands } from './commands/verify.js';
import { registerRulesCommands } from './commands/rules.js';
import { registerDoctorCommand } from './commands/doctor.js';
import { registerInitCommand } from './commands/init.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

export async function main(argv) {
  // Load configuration
  const config = await loadConfig();

  // Create output formatter
  const output = new OutputFormatter(config);

  // Create main program
  const program = new Command();

  program
    .name('summit')
    .description('Unified CLI for IntelGraph Summit platform')
    .version(packageJson.version, '-v, --version', 'Show version')
    .helpOption('-h, --help', 'Show help');

  // Global options
  program
    .option('--json', 'Output in JSON format')
    .option('--ndjson', 'Output in newline-delimited JSON format (streaming)')
    .option('--no-color', 'Disable colored output')
    .option('--verbose', 'Verbose logging')
    .option('-q, --quiet', 'Minimal output')
    .option('--config <path>', 'Custom config file path')
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.optsWithGlobals();

      // Configure output formatter based on global flags
      if (opts.json) {
        output.setFormat('json');
      } else if (opts.ndjson) {
        output.setFormat('ndjson');
      }

      if (opts.noColor) {
        output.setColor(false);
      }

      if (opts.verbose) {
        output.setVerbose(true);
      }

      if (opts.quiet) {
        output.setQuiet(true);
      }

      // Store output formatter in command context
      thisCommand._output = output;
      thisCommand._config = config;
    });

  // Register all command groups
  registerDevCommands(program, config, output);
  registerTestCommands(program, config, output);
  registerDbCommands(program, config, output);
  registerDeployCommands(program, config, output);
  registerPipelineCommands(program, config, output);
  registerCopilotCommands(program, config, output);
  registerCatalogCommands(program, config, output);
  registerVerifyCommands(program, config, output);
  registerRulesCommands(program, config, output);
  registerDoctorCommand(program, config, output);
  registerInitCommand(program, config, output);

  // Custom help formatting
  program.addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.cyan('$ summit dev up')}              Start development stack
  ${chalk.cyan('$ summit test smoke')}          Run smoke tests
  ${chalk.cyan('$ summit db migrate')}          Run database migrations
  ${chalk.cyan('$ summit deploy staging')}      Deploy to staging
  ${chalk.cyan('$ summit doctor')}              Run system diagnostics
  ${chalk.cyan('$ summit --help')}              Show this help

${chalk.bold('Documentation:')}
  ${chalk.dim('https://docs.intelgraph.ai/summit-cli')}

${chalk.bold('AI Agent Usage:')}
  Use ${chalk.cyan('--json')} or ${chalk.cyan('--ndjson')} flags for machine-readable output:
  ${chalk.cyan('$ summit dev status --json')}
  `);

  // Parse arguments
  await program.parseAsync(argv);
}
