import { Command } from 'commander';
import { scaffoldService } from '@intelgraph/golden-path';
import path from 'path';
import chalk from 'chalk';

export const serviceCommands = new Command();

serviceCommands
  .command('create')
  .description('Create a new service from the Golden Path template')
  .argument('<name>', 'Name of the service')
  .option('-d, --destination <path>', 'Destination directory', '.')
  .action(async (name, options) => {
    try {
      const dest = path.resolve(options.destination, name);
      console.log(chalk.blue(`Scaffolding service "${name}" in ${dest}...`));
      await scaffoldService(dest, name);
      console.log(chalk.green(`Service "${name}" created successfully!`));
      console.log(chalk.white(`\nNext steps:\n  cd ${dest}\n  npm install\n  npm run dev`));
    } catch (error) {
      console.error(chalk.red('Error creating service:'), error);
      process.exit(1);
    }
  });
