import { Command } from 'commander';
import { Executor } from '../lib/executor.js';

/**
 * Register 'summit deploy' commands
 */
export function registerDeployCommands(program, config, output) {
  const deploy = new Command('deploy')
    .description('Deployment operations')
    .summary('Deploy to dev, staging, or production environments');

  // summit deploy dev
  deploy
    .command('dev')
    .description('Deploy to development environment')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('deploy dev');
        out.spin('Deploying to development...');

        await exec.execNpm('deploy:dev');

        out.spinSucceed('Deployment to dev completed');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Deployment to dev failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit deploy staging
  deploy
    .command('staging')
    .description('Deploy to staging environment with canary rollout')
    .option('--skip-verify', 'Skip image verification')
    .option('--skip-slo', 'Skip SLO checks')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('deploy staging', options);
        out.info('Deploying to staging with canary rollout...');

        // Use Makefile.release stage target
        const makeArgs = [];
        if (options.skipVerify) {
          makeArgs.push('SKIP_VERIFY=1');
        }
        if (options.skipSlo) {
          makeArgs.push('SKIP_SLO=1');
        }

        out.spin('Running staging deployment...');
        await exec.execMake('stage', makeArgs, {
          env: {
            SKIP_VERIFY: options.skipVerify ? '1' : '0',
            SKIP_SLO: options.skipSlo ? '1' : '0',
          },
        });

        out.spinSucceed('Staging deployment completed');
        out.success('Staging environment updated successfully');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Staging deployment failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit deploy prod
  deploy
    .command('prod')
    .description('Deploy to production environment')
    .option('--full-stack', 'Deploy full production stack (go-live-now.sh)')
    .option('--skip-verify', 'Skip image verification')
    .option('--skip-slo', 'Skip SLO checks')
    .option('--force', 'Skip confirmation prompts')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('deploy prod', options);

        if (!options.force) {
          out.warning('This will deploy to PRODUCTION!');
          if (out.format !== 'human') {
            throw new Error('Production deployment requires --force flag in non-interactive mode');
          }
          return;
        }

        if (options.fullStack) {
          out.info('Deploying full production stack...');
          out.spin('Running go-live-now.sh...');
          await exec.execScript('deploy/go-live-now.sh');
          out.spinSucceed('Full stack deployment completed');
        } else {
          out.info('Deploying to production...');

          const makeArgs = [];
          if (options.skipVerify) {
            makeArgs.push('SKIP_VERIFY=1');
          }
          if (options.skipSlo) {
            makeArgs.push('SKIP_SLO=1');
          }

          out.spin('Running production deployment...');
          await exec.execMake('prod', makeArgs);
          out.spinSucceed('Production deployment completed');
        }

        out.success('Production environment updated successfully');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Production deployment failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit deploy rollback
  deploy
    .command('rollback')
    .description('Rollback deployment')
    .argument('<environment>', 'Environment to rollback (dev, staging, prod)')
    .option('--revision <n>', 'Revision to rollback to')
    .action(async (environment, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('deploy rollback', { environment, ...options });
        out.warning(`Rolling back ${environment}...`);

        out.spin('Executing rollback...');
        await exec.execScript('scripts/auto-rollback.sh', [environment]);
        out.spinSucceed('Rollback completed');

        out.success(`${environment} has been rolled back`);
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Rollback failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit deploy status
  deploy
    .command('status')
    .description('Check deployment status')
    .argument('[environment]', 'Environment to check (dev, staging, prod)')
    .action(async (environment, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('deploy status', { environment });

        if (environment) {
          out.info(`Checking ${environment} deployment status...`);
          // TODO: Query deployment status from k8s/argo
        } else {
          out.info('Checking all environments...');
          // TODO: Query all environments
        }

        out.endCommand(true);
      } catch (error) {
        out.error('Failed to get deployment status', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  program.addCommand(deploy);
}
