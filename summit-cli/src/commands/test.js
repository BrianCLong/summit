import { Command } from 'commander';
import { Executor } from '../lib/executor.js';

/**
 * Register 'summit test' commands
 */
export function registerTestCommands(program, config, output) {
  const test = new Command('test')
    .description('Testing commands')
    .summary('Run smoke, unit, integration, and E2E tests');

  // summit test smoke
  test
    .command('smoke')
    .description('Run smoke tests (golden path validation)')
    .option('--backend-only', 'Only test backend')
    .option('--frontend-only', 'Only test frontend')
    .option('--timeout <ms>', 'Test timeout in milliseconds', '120000')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('test smoke', options);
        out.info('Running smoke tests...');

        let script = 'test:smoke';
        if (options.backendOnly) {
          script = 'test:smoke:backend';
        } else if (options.frontendOnly) {
          script = 'test:smoke:frontend';
        }

        out.spin('Executing smoke tests...');
        const result = await exec.execNpm(script, [], {
          env: { SMOKE_TIMEOUT: options.timeout },
        });

        out.spinSucceed('Smoke tests passed');
        out.success('All golden path validations successful!');
        out.endCommand(true, { exitCode: result.exitCode });
      } catch (error) {
        out.spinStop();
        out.error('Smoke tests failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit test unit
  test
    .command('unit')
    .description('Run unit tests')
    .option('-w, --watch', 'Watch mode')
    .option('--coverage', 'Generate coverage report')
    .argument('[pattern]', 'Test file pattern to match')
    .action(async (pattern, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('test unit', { pattern, ...options });

        const args = [];
        if (options.watch) {
          args.push('--watch');
        }
        if (options.coverage) {
          args.push('--coverage');
        }
        if (pattern) {
          args.push(pattern);
        }

        await exec.execNpm('test:unit', args);
        out.endCommand(true);
      } catch (error) {
        out.error('Unit tests failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit test integration
  test
    .command('integration')
    .description('Run integration tests')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('test integration');
        out.spin('Running integration tests...');

        await exec.execNpm('test:integration');

        out.spinSucceed('Integration tests passed');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Integration tests failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit test e2e
  test
    .command('e2e')
    .description('Run end-to-end tests')
    .option('--headed', 'Run tests in headed mode (show browser)')
    .option('--ui', 'Run tests in UI mode')
    .argument('[spec]', 'Specific test spec to run')
    .action(async (spec, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('test e2e', { spec, ...options });

        const args = [];
        if (options.headed) {
          args.push('--headed');
        }
        if (options.ui) {
          args.push('--ui');
        }
        if (spec) {
          args.push(spec);
        }

        await exec.execNpm('test:e2e', args);
        out.endCommand(true);
      } catch (error) {
        out.error('E2E tests failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit test policy
  test
    .command('policy')
    .description('Run policy validation tests')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('test policy');
        out.spin('Running policy tests...');

        await exec.execNpm('test:policy');

        out.spinSucceed('Policy tests passed');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Policy tests failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit test all
  test
    .command('all')
    .description('Run all test suites')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('test all');
        out.info('Running all test suites...');

        const suites = [
          { name: 'Unit tests', script: 'test:unit' },
          { name: 'Integration tests', script: 'test:integration' },
          { name: 'Smoke tests', script: 'test:smoke' },
          { name: 'Policy tests', script: 'test:policy' },
        ];

        let allPassed = true;
        for (const suite of suites) {
          out.spin(`Running ${suite.name}...`);
          try {
            await exec.execNpm(suite.script);
            out.spinSucceed(`${suite.name} passed`);
          } catch (error) {
            out.spinFail(`${suite.name} failed`);
            allPassed = false;
          }
        }

        if (allPassed) {
          out.success('All test suites passed!');
          out.endCommand(true);
        } else {
          out.error('Some test suites failed');
          out.endCommand(false);
          process.exit(1);
        }
      } catch (error) {
        out.spinStop();
        out.error('Test execution failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  program.addCommand(test);
}
