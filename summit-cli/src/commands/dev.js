import { Command } from 'commander';
import { Executor } from '../lib/executor.js';

/**
 * Register 'summit dev' commands
 */
export function registerDevCommands(program, config, output) {
  const dev = new Command('dev')
    .description('Development workflow commands')
    .summary('Start, stop, and manage development stack');

  // summit dev up
  dev
    .command('up')
    .description('Start development stack')
    .option('-p, --profile <profiles...>', 'Docker compose profiles to enable', ['default'])
    .option('--no-migrate', 'Skip automatic migrations')
    .option('--no-seed', 'Skip automatic seeding')
    .option('--build', 'Force rebuild containers')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('dev up', options);
        out.info('Starting development stack...');

        // Build if requested
        if (options.build) {
          out.spin('Building containers...');
          await exec.execCompose('build', [], { profiles: options.profile });
          out.spinSucceed('Containers built');
        }

        // Start services
        out.spin('Starting services...');
        await exec.execCompose('up', ['-d'], { profiles: options.profile });
        out.spinSucceed('Services started');

        // Wait for services to be healthy
        out.spin('Waiting for services to be healthy...');
        await new Promise((resolve) => setTimeout(resolve, 5000));
        out.spinSucceed('Services are healthy');

        // Run migrations if enabled
        if (options.migrate && cfg.dev?.autoMigrate !== false) {
          out.spin('Running database migrations...');
          try {
            await exec.execNpm('db:migrate');
            out.spinSucceed('Migrations completed');
          } catch (error) {
            out.spinFail('Migrations failed');
            out.warning('Continuing without migrations');
          }
        }

        // Seed data if enabled
        if (options.seed && cfg.dev?.autoSeed) {
          out.spin('Seeding database...');
          try {
            await exec.execNpm('db:seed');
            out.spinSucceed('Database seeded');
          } catch (error) {
            out.spinFail('Seeding failed');
            out.warning('Continuing without seed data');
          }
        }

        out.success('Development stack is ready!');
        out.info('View logs: summit dev logs');
        out.info('Check status: summit dev status');

        out.endCommand(true, { profiles: options.profile });
      } catch (error) {
        out.spinStop();
        out.error('Failed to start development stack', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit dev down
  dev
    .command('down')
    .description('Stop development stack')
    .option('-v, --volumes', 'Remove volumes')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('dev down', options);
        out.spin('Stopping services...');

        const args = options.volumes ? ['-v'] : [];
        await exec.execCompose('down', args);

        out.spinSucceed('Development stack stopped');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Failed to stop development stack', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit dev restart
  dev
    .command('restart')
    .description('Restart development services')
    .argument('[services...]', 'Specific services to restart')
    .action(async (services, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('dev restart', { services });
        out.spin('Restarting services...');

        await exec.execCompose('restart', services);

        out.spinSucceed('Services restarted');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Failed to restart services', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit dev status
  dev
    .command('status')
    .description('Show development stack status')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('dev status');

        const services = await exec.getComposeStatus();

        if (out.format === 'human') {
          if (services.length === 0) {
            out.warning('No services running');
          } else {
            out.info('Development stack status:');
            out.table(
              ['Service', 'Status', 'Health', 'Ports'],
              services.map((s) => [
                s.Service || s.Name,
                s.State || 'unknown',
                s.Health || 'n/a',
                s.Publishers?.map((p) => `${p.PublishedPort || ''}:${p.TargetPort || ''}`).join(', ') || 'n/a',
              ])
            );
          }
        }

        out.endCommand(true, { services });
      } catch (error) {
        out.error('Failed to get service status', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit dev logs
  dev
    .command('logs')
    .description('View development stack logs')
    .argument('[services...]', 'Specific services to show logs for')
    .option('-f, --follow', 'Follow log output')
    .option('-n, --tail <lines>', 'Number of lines to show from the end', '100')
    .action(async (services, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        const args = ['--tail', options.tail];
        if (options.follow) {
          args.push('-f');
        }
        args.push(...services);

        await exec.execCompose('logs', args);
      } catch (error) {
        out.error('Failed to view logs', error);
        process.exit(1);
      }
    });

  // summit dev build
  dev
    .command('build')
    .description('Build development services')
    .argument('[services...]', 'Specific services to build')
    .option('--no-cache', 'Build without cache')
    .action(async (services, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('dev build', { services, noCache: options.noCache });
        out.spin('Building services...');

        const args = [];
        if (options.noCache) {
          args.push('--no-cache');
        }
        args.push(...services);

        await exec.execCompose('build', args);

        out.spinSucceed('Build completed');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Build failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit dev shell
  dev
    .command('shell')
    .description('Open interactive shell in a service')
    .argument('<service>', 'Service to connect to')
    .option('--root', 'Run shell as root user')
    .action(async (service, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        const args = [];
        if (options.root) {
          args.push('--user', 'root');
        }
        args.push(service, '/bin/bash');

        await exec.execCompose('exec', args);
      } catch (error) {
        out.error(`Failed to open shell in ${service}`, error);
        process.exit(1);
      }
    });

  program.addCommand(dev);
}
