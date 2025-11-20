import { Command } from 'commander';
import { Executor } from '../lib/executor.js';
import inquirer from 'inquirer';

/**
 * Register 'summit init' command
 */
export function registerInitCommand(program, config, output) {
  program
    .command('init')
    .description('Bootstrap and setup Summit environment')
    .option('--auto', 'Skip interactive prompts and use defaults')
    .action(async (options, command) => {
      const out = command.parent._output;
      const cfg = command.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('init', options);
        out.info('Welcome to Summit! Let\'s set up your environment.\n');

        let setupOptions = {
          installDeps: true,
          setupDocker: true,
          runMigrations: true,
          seedData: false,
        };

        // Interactive mode
        if (!options.auto && out.format === 'human') {
          const answers = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'installDeps',
              message: 'Install dependencies (pnpm install)?',
              default: true,
            },
            {
              type: 'confirm',
              name: 'setupDocker',
              message: 'Start Docker services?',
              default: true,
            },
            {
              type: 'confirm',
              name: 'runMigrations',
              message: 'Run database migrations?',
              default: true,
            },
            {
              type: 'confirm',
              name: 'seedData',
              message: 'Seed database with demo data?',
              default: false,
            },
          ]);
          setupOptions = answers;
        }

        // Step 1: Install dependencies
        if (setupOptions.installDeps) {
          out.spin('Installing dependencies...');
          try {
            await exec.execMake('bootstrap');
            out.spinSucceed('Dependencies installed');
          } catch (error) {
            out.spinFail('Failed to install dependencies');
            throw error;
          }
        }

        // Step 2: Setup Docker services
        if (setupOptions.setupDocker) {
          out.spin('Starting Docker services...');
          try {
            await exec.execCompose('up', ['-d']);
            out.spinSucceed('Docker services started');

            // Wait for services to be healthy
            out.spin('Waiting for services to be ready...');
            await new Promise((resolve) => setTimeout(resolve, 10000));
            out.spinSucceed('Services are ready');
          } catch (error) {
            out.spinFail('Failed to start Docker services');
            throw error;
          }
        }

        // Step 3: Run migrations
        if (setupOptions.runMigrations) {
          out.spin('Running database migrations...');
          try {
            await exec.execNpm('db:migrate');
            out.spinSucceed('Migrations completed');
          } catch (error) {
            out.spinFail('Failed to run migrations');
            throw error;
          }
        }

        // Step 4: Seed data
        if (setupOptions.seedData) {
          out.spin('Seeding database...');
          try {
            await exec.execNpm('db:seed');
            out.spinSucceed('Database seeded');
          } catch (error) {
            out.spinFail('Failed to seed database');
            out.warning('Continuing without seed data');
          }
        }

        // Success!
        out.success('\n✓ Summit environment is ready!\n');
        out.info('Next steps:');
        out.info('  • Check service status:  summit dev status');
        out.info('  • Run smoke tests:       summit test smoke');
        out.info('  • View logs:             summit dev logs');
        out.info('  • Get help:              summit --help');

        out.endCommand(true, setupOptions);
      } catch (error) {
        out.spinStop();
        out.error('\nSetup failed. Please fix the errors and try again.', error);
        out.endCommand(false);
        process.exit(1);
      }
    });
}
