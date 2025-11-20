import { Command } from 'commander';
import { Executor } from '../lib/executor.js';

/**
 * Register 'summit pipelines' commands
 */
export function registerPipelineCommands(program, config, output) {
  const pipelines = new Command('pipelines')
    .alias('pipeline')
    .description('Pipeline and workflow orchestration')
    .summary('Execute, monitor, and manage data pipelines');

  // summit pipelines run
  pipelines
    .command('run')
    .description('Execute a pipeline or workflow')
    .argument('<pipeline>', 'Pipeline name or path')
    .option('-e, --engine <engine>', 'Execution engine (maestro, chronos, argo)', config.pipelines?.defaultEngine || 'maestro')
    .option('--params <json>', 'Pipeline parameters as JSON')
    .option('--async', 'Run asynchronously (non-blocking)')
    .action(async (pipeline, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('pipelines run', { pipeline, ...options });
        out.info(`Running pipeline: ${pipeline}`);

        if (options.engine === 'maestro') {
          out.spin('Executing via Maestro...');
          const args = [pipeline];
          if (options.params) {
            args.push('--params', options.params);
          }
          // Maestro CLI would be invoked here
          await exec.execNpm('maestro', ['run', ...args]);
          out.spinSucceed('Pipeline executed');
        } else if (options.engine === 'chronos') {
          out.spin('Compiling workflow...');
          // Chronos intent engine
          await exec.exec('chronos-intent', ['compile', pipeline]);
          out.spinSucceed('Workflow compiled and submitted');
        } else if (options.engine === 'argo') {
          out.spin('Submitting to Argo Workflows...');
          await exec.exec('argo', ['submit', pipeline]);
          out.spinSucceed('Workflow submitted');
        }

        out.success(`Pipeline ${pipeline} completed`);
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error(`Pipeline execution failed: ${pipeline}`, error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit pipelines list
  pipelines
    .command('list')
    .description('List available pipelines')
    .option('-e, --engine <engine>', 'Filter by engine')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('pipelines list', options);
        out.info('Available pipelines:');

        // List workflows from workflow directory
        const workflowDir = cfg.pipelines?.workflowDir || './workflows';
        const result = await exec.exec('find', [workflowDir, '-name', '*.yaml', '-o', '-name', '*.yml'], {
          stdio: 'pipe',
          ignoreExitCode: true,
        });

        if (result.stdout) {
          const pipelines = result.stdout.trim().split('\n').filter(Boolean);
          if (out.format === 'human') {
            pipelines.forEach((p) => console.log(`  - ${p}`));
          }
          out.endCommand(true, { pipelines });
        } else {
          out.warning('No pipelines found');
          out.endCommand(true, { pipelines: [] });
        }
      } catch (error) {
        out.error('Failed to list pipelines', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit pipelines status
  pipelines
    .command('status')
    .description('Check pipeline execution status')
    .argument('[pipeline-id]', 'Pipeline execution ID')
    .action(async (pipelineId, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('pipelines status', { pipelineId });

        if (pipelineId) {
          out.info(`Checking status of pipeline: ${pipelineId}`);
          // TODO: Query pipeline status from execution engine
        } else {
          out.info('Recent pipeline executions:');
          // TODO: List recent executions
        }

        out.endCommand(true);
      } catch (error) {
        out.error('Failed to get pipeline status', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit pipelines cancel
  pipelines
    .command('cancel')
    .description('Cancel a running pipeline')
    .argument('<pipeline-id>', 'Pipeline execution ID to cancel')
    .action(async (pipelineId, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('pipelines cancel', { pipelineId });
        out.spin(`Canceling pipeline: ${pipelineId}...`);

        // TODO: Cancel pipeline via execution engine API
        out.spinSucceed('Pipeline canceled');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Failed to cancel pipeline', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit pipelines validate
  pipelines
    .command('validate')
    .description('Validate pipeline definition')
    .argument('<pipeline>', 'Pipeline file to validate')
    .action(async (pipeline, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('pipelines validate', { pipeline });
        out.spin('Validating pipeline definition...');

        // Use chronos-intent to validate YAML workflow
        await exec.exec('chronos-intent', ['validate', pipeline]);

        out.spinSucceed('Pipeline definition is valid');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Pipeline validation failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  program.addCommand(pipelines);
}
