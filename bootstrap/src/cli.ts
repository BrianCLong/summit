import { Command } from 'commander';
import { SummitEngine } from './engine.js';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The CLI is running from bootstrap/src/cli.ts, so root of bootstrap is up one level
const bootstrapRoot = path.resolve(__dirname, '..');

const program = new Command();
const engine = new SummitEngine(bootstrapRoot);

program
  .name('summit')
  .description('Summit Orchestrator CLI')
  .version('1.0.0');

program.command('init')
  .description('Initialize the Summit Runtime')
  .action(async () => {
    try {
      await engine.init();
    } catch (e) {
      console.error(chalk.red('Initialization failed:'), e);
      process.exit(1);
    }
  });

program.command('run <flow>')
  .description('Run a specific flow')
  .action(async (flow) => {
    try {
        await engine.runFlow(flow);
    } catch (e) {
        console.error(chalk.red('Flow execution failed:'), e);
        process.exit(1);
    }
  });

program.command('flows')
  .description('List available flows')
  .action(async () => {
      await engine.listFlows();
  });

program.command('agents')
  .description('List registered agents')
  .action(async () => {
      await engine.listAgents();
  });

program.command('agent <name>')
  .description('Get info about a specific agent')
  .action(async (name) => {
      await engine.getAgentInfo(name);
  });

program.command('governance')
  .description('Run governance checks')
  .action(async () => {
      await engine.checkGovernance();
  });

program.parse();
