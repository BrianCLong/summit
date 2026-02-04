import path from 'path';
import { Command } from 'commander';
import { loadAgentRegistry, stableStringify, type ValidationError } from '@summit/agent-registry';
import { exitWithError, formatOutput, success, warn } from '../utils.js';

function defaultRegistryPath(): string {
  return path.resolve(process.cwd(), 'docs/agents/registry');
}

function formatErrors(errors: ValidationError[]): string {
  return errors
    .map((error) => {
      const pathSuffix = error.path ? ` (${error.path})` : '';
      return `- ${error.file}${pathSuffix}: ${error.message}`;
    })
    .join('\n');
}

export const agentsCommands = new Command('agents')
  .description('Agent registry commands')
  .addCommand(
    new Command('list')
      .description('List registered agents')
      .option('-p, --path <path>', 'Registry directory or glob', defaultRegistryPath())
      .option('--json', 'Output JSON instead of a table', false)
      .action(async (options) => {
        const { agents, errors } = await loadAgentRegistry(options.path);

        if (errors.length > 0) {
          exitWithError(`Agent registry validation failed:\n${formatErrors(errors)}`);
        }

        if (agents.length === 0) {
          warn('No agents found in the registry.');
          return;
        }

        if (options.json) {
          console.log(stableStringify(agents));
          return;
        }

        console.log(
          formatOutput(agents, ['id', 'name', 'version', 'role', 'data_access'])
        );
      })
  )
  .addCommand(
    new Command('validate')
      .description('Validate agent registry files')
      .option('-p, --path <path>', 'Registry directory or glob', defaultRegistryPath())
      .action(async (options) => {
        const { errors } = await loadAgentRegistry(options.path);

        if (errors.length > 0) {
          exitWithError(`Agent registry validation failed:\n${formatErrors(errors)}`);
        }

        success('Agent registry validation succeeded.');
      })
  );
